import { createHash, randomUUID } from 'node:crypto'
import { existsSync, readFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

import { farmLevel } from '../farm/catalog'
import { clone, validateFarm } from '../farm/rules'
import { readJson, writeJsonAtomic } from './files'

export const SAVE_FILES = ['player-store', 'player-resource-store', 'school-handbook-store'] as const
type SaveName = typeof SAVE_FILES[number]
export type GameSaves = Record<SaveName, Record<string, unknown>>
export type GameBackup = {
  format: 'petmate-save'; version: 1; appVersion: string; createdAt: string;
  owner: string | null; saves: GameSaves; checksum: string
}
type RestoreJournal = { phase: 'prepared' | 'committed'; before: GameBackup; target: GameBackup }

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const nonnegative = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER
const integer = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.length > 0
const itemType = (value: unknown) => nonempty(value) || (Array.isArray(value) && value.length > 0 && value.every(nonempty))
const timestamp = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value))
const checksum = (value: Omit<GameBackup, 'checksum'>) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const petNumbers = ['level', 'exp', 'nextExp', 'gameLevel', 'gameExp', 'gameNextExp', 'singLevel', 'singExp', 'singNextExp', 'drawLevel', 'drawExp', 'drawNextExp', 'affectionLevel', 'affectionExp', 'affectionNextExp', 'hungry', 'emotion', 'energy', 'health', 'maxHungry', 'maxEmotion', 'maxEnergy', 'maxHealth', 'maxBuffs']

export function validateGameSaves(value: unknown): asserts value is GameSaves {
  if (!record(value) || SAVE_FILES.some(name => !record(value[name]))) throw new Error('备份缺少完整关联存档')
  const saves = value as GameSaves
  const root = saves['player-store']
  const player = root.playerInfo
  if (!record(player) || typeof player.name !== 'string' || !nonnegative(player.cash) || !Array.isArray(player.items) || !Array.isArray(player.petmates) || !player.petmates.length) throw new Error('玩家存档无效')
  if (player.items.some(item => !record(item) || !integer(item.id) || !integer(item.count) || !nonempty(item.name) || !itemType(item.type))) throw new Error('背包存档无效')
  const petIds = new Set<number>()
  for (const pet of player.petmates) {
    if (!record(pet) || !integer(pet.id) || petIds.has(pet.id) || !nonempty(pet.name) || !record(pet.attrs) || petNumbers.some(key => !nonnegative((pet.attrs as Record<string, unknown>)[key])) || !Array.isArray(pet.attrs.buffs) || !record(pet.status) || !nonempty(pet.status.status) || !Array.isArray(pet.wishes) || !integer(pet.completedWishesNum)) throw new Error('角色存档无效')
    petIds.add(pet.id as number)
    if (pet.attrs.buffs.some(buff => !record(buff) || !nonempty(buff.id) || !record(buff.buff) || !timestamp(buff.endTime))) throw new Error('角色增益存档无效')
    for (const key of ['startTime', 'endTime']) if (pet.status[key] != null && !timestamp(pet.status[key])) throw new Error('角色活动时间无效')
    if (pet.wishes.some(wish => !record(wish) || !nonempty(wish.id) || !Array.isArray(wish.requirements) || !timestamp(wish.startTime) || !timestamp(wish.endTime) || !nonnegative(wish.duration))) throw new Error('角色心愿存档无效')
  }
  if (root.farm !== undefined) validateFarm(root.farm)
  if (root.revision !== undefined && (!Number.isSafeInteger(root.revision) || Number(root.revision) < 0)) throw new Error('存档版本无效')
  if (root.farmReceipts !== undefined && (!Array.isArray(root.farmReceipts) || root.farmReceipts.length > 128 || root.farmReceipts.some(receipt => !record(receipt) || typeof receipt.requestId !== 'string' || typeof receipt.fingerprint !== 'string' || !record(receipt.feedback)))) throw new Error('农场操作记录无效')
  const resources = saves['player-resource-store'].resources
  if (!record(resources) || !['skins', 'titles', 'animationResources', 'completedCommissionIds'].every(key => Array.isArray(resources[key])) || !nonempty(resources.equippedSkinId) || !(resources.equippedTitleId === null || nonempty(resources.equippedTitleId)) || !record(resources.commissionCompletionCounts) || Object.values(resources.commissionCompletionCounts).some(count => !integer(count)) || !integer(resources.schoolHandbookLimitedItemMissCount)) throw new Error('玩家资源存档无效')
  if ((resources.completedCommissionIds as unknown[]).some(id => !nonempty(id)) || ['skins', 'titles', 'animationResources'].some(key => (resources[key] as unknown[]).some(item => !record(item) || !nonempty(item.id) || !nonempty(item.name) || !nonempty(item.acquiredAt)))) throw new Error('玩家资源条目无效')
  const handbook = saves['school-handbook-store'].state
  if (!record(handbook) || handbook.schemaVersion !== 2 || !integer(handbook.batchSequence) || !integer(handbook.stampCount) || !record(handbook.currentBatch) || !Array.isArray(handbook.claimedRewards)) throw new Error('活动进度存档无效')
  const batch = handbook.currentBatch
  if (!nonempty(batch.id) || !integer(batch.sequence) || !Array.isArray(batch.tasks) || batch.tasks.some(task => !record(task) || !nonempty(task.id) || !integer(task.completedCount)) || !timestamp(batch.createdAt) || (batch.completedAt !== undefined && !timestamp(batch.completedAt)) || (batch.nextRefreshAt !== undefined && !timestamp(batch.nextRefreshAt))) throw new Error('活动任务存档无效')
  if (handbook.claimedRewards.some(claim => !record(claim) || !nonempty(claim.milestoneId) || !integer(claim.stampCount) || !record(claim.reward) || !nonempty(claim.reward.id) || !timestamp(claim.claimedAt))) throw new Error('活动奖励记录无效')
}

export function makeBackup(saves: GameSaves, appVersion: string, now = new Date()): GameBackup {
  validateGameSaves(saves)
  const player = saves['player-store'].playerInfo as Record<string, unknown>
  const content: Omit<GameBackup, 'checksum'> = {
    format: 'petmate-save', version: 1, appVersion, createdAt: now.toISOString(),
    owner: typeof player.steamId === 'string' ? player.steamId : null, saves: clone(saves)
  }
  return { ...content, checksum: checksum(content) }
}

export function validateBackup(value: unknown, owner?: string | null): asserts value is GameBackup {
  if (!record(value) || value.format !== 'petmate-save' || value.version !== 1 || !timestamp(value.createdAt) || typeof value.appVersion !== 'string' || typeof value.checksum !== 'string' || !(value.owner === null || typeof value.owner === 'string')) throw new Error('不支持的备份格式或版本')
  const { checksum: supplied, ...content } = value
  if (supplied !== checksum(content as Omit<GameBackup, 'checksum'>)) throw new Error('备份已损坏，完整性校验失败')
  validateGameSaves(value.saves)
  const player = (value.saves as GameSaves)['player-store'].playerInfo as Record<string, unknown>
  if ((typeof player.steamId === 'string' ? player.steamId : null) !== value.owner) throw new Error('备份玩家信息不一致')
  if (owner && value.owner !== owner) throw new Error('备份不属于当前玩家')
}

export function captureGameSaves(directory: string): GameSaves {
  const saves = Object.fromEntries(SAVE_FILES.map(name => [name, readJson(join(directory, `${name}.json`))]))
  validateGameSaves(saves)
  return saves
}
export function backupSummary(backup: GameBackup) {
  const root = backup.saves['player-store']
  const farm = root.farm as { exp: number } | undefined
  const player = root.playerInfo as { cash: number }
  return { createdAt: backup.createdAt, level: farmLevel(farm?.exp ?? 0), cash: player.cash,
    scope: '农场、共用余额、背包、角色、皮肤与称谓、委托记录、活动进度与奖励领取状态' }
}
export function listAutomaticBackup(directory: string): string | null {
  const pointer = join(directory, 'backups', 'last-before-restore.json')
  return existsSync(pointer) ? pointer : null
}

export function recoverInterruptedRestore(directory: string): void {
  const path = join(directory, 'restore-journal.json')
  if (!existsSync(path)) return
  const journal = readJson(path) as RestoreJournal
  if (!journal || !['prepared', 'committed'].includes(journal.phase)) throw new Error('恢复日志无效，需要保留存档后排查')
  validateBackup(journal.before)
  validateBackup(journal.target)
  const selected = journal.phase === 'committed' ? journal.target : journal.before
  for (const name of SAVE_FILES) writeJsonAtomic(join(directory, `${name}.json`), selected.saves[name])
  unlinkSync(path)
}

export function restoreGameBackup(
  directory: string,
  target: GameBackup,
  appVersion: string,
  afterWrite: (_name: SaveName | 'journal' | 'commit') => void = () => {},
  write: typeof writeJsonAtomic = writeJsonAtomic
): string {
  const before = makeBackup(captureGameSaves(directory), appVersion)
  validateBackup(target, before.owner)
  const automatic = join(directory, 'backups', `before-restore-${Date.now()}-${randomUUID()}.json`)
  write(automatic, before)
  validateBackup(readJson(automatic))
  write(join(directory, 'backups', 'last-before-restore.json'), before)
  const journalPath = join(directory, 'restore-journal.json')
  const journal: RestoreJournal = { phase: 'prepared', before, target }
  write(journalPath, journal)
  try {
    afterWrite('journal')
    for (const name of SAVE_FILES) {
      write(join(directory, `${name}.json`), target.saves[name])
      afterWrite(name)
    }
    captureGameSaves(directory)
    write(journalPath, { ...journal, phase: 'committed' })
  } catch (error) {
    // Leave the journal intact if rollback fails; startup must finish it first.
    for (const name of SAVE_FILES) write(join(directory, `${name}.json`), before.saves[name])
    unlinkSync(journalPath)
    throw error
  }
  afterWrite('commit')
  unlinkSync(journalPath)
  return automatic
}

export function loadBackupFile(path: string, owner: string | null): GameBackup {
  const text = readFileSync(path, 'utf8')
  if (text.length > 20 * 1024 * 1024) throw new Error('备份文件过大')
  const backup: unknown = JSON.parse(text)
  validateBackup(backup, owner)
  return backup
}
