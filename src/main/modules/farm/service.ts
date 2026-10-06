import { updateFarmAchievements } from '../../../shared/farmAchievements'
import { ensureFarmLife, type FarmLifeData } from '../../../shared/farmLife'
import { farmDevelopmentActions, type FarmDevelopmentAction } from '../../../shared/farmLifeDevelopment'
import type { FarmAssistantMetadata, FarmCommand, FarmOperation, FarmPreview, FarmResult, FarmSnapshot, FarmState, FarmView } from '../../types/farm'
import { farmCatalog, farmLevel, getCrop, unlockedPlots } from './catalog'
import { safeHelp } from './lifeRules'
import { applyOperation, clone, createFarm, eligiblePlots, growFarm, plantStage, validateFarm } from './rules'

export interface FarmRepository {
  read(): FarmSnapshot
  commit(snapshot: FarmSnapshot): void
}
export interface FarmClock { wall(): number; monotonic(): number }

export class FarmService {
  private lastClock: { wall: number; monotonic: number } | null = null
  private lastCheckpoint = 0
  private saveError: string | null = null

  constructor(
    private readonly repository: FarmRepository,
    private readonly clock: FarmClock,
    private readonly id: () => string,
    private readonly random: () => number = Math.random,
    private readonly onCommitted: (farm: FarmState) => void = () => {}
  ) {}

  private persist(snapshot: FarmSnapshot): void {
    try {
      if (snapshot.farm) {
        updateFarmAchievements(snapshot.farm, farmCatalog, unlockedPlots(snapshot.farm.exp))
      }
      this.repository.commit(snapshot)
      this.lastCheckpoint = this.clock.monotonic()
      this.saveError = null
    } catch (error) {
      this.saveError = '存档暂不可用，本次操作未完成。请检查磁盘后重试。'
      throw error
    }
    // External achievement failures must never turn a saved trade into an error.
    if (snapshot.farm) { try { this.onCommitted(clone(snapshot.farm)) } catch { /* Retry at the next durable checkpoint. */ } }
  }

  private current(): FarmSnapshot {
    const snapshot = clone(this.repository.read())
    if (snapshot.farm) validateFarm(snapshot.farm)
    return snapshot
  }

  private project(): FarmSnapshot {
    const snapshot = this.current()
    const now = this.clock.wall()
    const mono = this.clock.monotonic()
    if (!snapshot.farm) {
      snapshot.farm = createFarm(now, this.id)
      snapshot.revision++
      this.persist(snapshot)
      this.lastClock = { wall: now, monotonic: mono }
      return snapshot
    }
    const elapsed = this.lastClock
      ? Math.max(0, mono - this.lastClock.monotonic, now - this.lastClock.wall)
      : Math.max(0, now - snapshot.farm.lastWallTime)
    // Project from the last durable checkpoint, not from the previous UI read.
    growFarm(snapshot.farm, elapsed, now, this.id, this.random)
    if (snapshot.farm.life) ensureFarmLife(snapshot.farm, now)
    return snapshot
  }

  private anchor(snapshot: FarmSnapshot): void {
    this.lastClock = { wall: snapshot.farm?.lastWallTime ?? this.clock.wall(), monotonic: this.clock.monotonic() }
  }

  private view(snapshot: FarmSnapshot): FarmView {
    return { ...snapshot, catalog: farmCatalog, level: farmLevel(snapshot.farm?.exp ?? 0), unlockedPlots: unlockedPlots(snapshot.farm?.exp ?? 0), saveError: this.saveError }
  }

  getView(): FarmView {
    try {
      const snapshot = this.project()
      const durable = this.current()
      const signature = (value: FarmSnapshot) => JSON.stringify({
        stages: value.farm?.plots.map(plot => plot.plant ? plantStage(plot.plant) : null),
        orders: value.farm?.orders.map(order => 'instanceId' in order ? order.instanceId : null)
      })
      if (signature(snapshot) !== signature(durable) || this.clock.monotonic() - this.lastCheckpoint >= 30_000 || this.saveError) {
        this.persist(snapshot)
        this.anchor(snapshot)
      }
      return this.view(snapshot)
    } catch (error) {
      if (!this.saveError) throw error
      const durable = this.current()
      if (!durable.farm) throw error
      return this.view(durable)
    }
  }

  checkpoint(): void {
    const snapshot = this.project()
    this.persist(snapshot)
    this.anchor(snapshot)
  }

  /** Only the authorized development controller calls this; no harvest rewards are granted. */
  editForDevelopment(action: FarmDevelopmentAction): FarmView {
    if (!Object.hasOwn(farmDevelopmentActions, action)) throw new Error('未知操作。')
    const snapshot = this.project()
    if (action !== 'addCoins' && snapshot.farm!.life?.active)
      throw new Error('尤美正在出行，请等待返回后再调整农田或额度。')
    if (action === 'addCoins') {
      const cash = snapshot.cash + 1000
      if (!Number.isSafeInteger(cash) || cash < 0) throw new Error('金币余额超出允许范围。')
      snapshot.cash = cash
    } else if (action === 'resetQuota') {
      ensureFarmLife(snapshot.farm!, this.clock.wall()).daily = {
        trips: 0, work: 0, life: 0, watered: 0, harvested: 0
      }
    } else {
      for (const plot of snapshot.farm!.plots) {
        if (!plot.plant) continue
        if (action === 'clearCrops') plot.plant = null
        else plot.plant.elapsedMs = plot.plant.durationMs
      }
    }
    validateFarm(snapshot.farm)
    snapshot.revision++
    this.persist(snapshot)
    this.anchor(snapshot)
    return this.view(snapshot)
  }

  preview(operation: FarmOperation): FarmPreview {
    const snapshot = this.project()
    const farm = snapshot.farm!
    let eligible = eligiblePlots(farm, operation)
    let tutorial = 0
    if (operation.type === 'sow') {
      const crop = getCrop(operation.cropId)
      if (crop.level > farmLevel(farm.exp)) throw new Error('作物尚未解锁')
      eligible = eligible.slice(0, farm.seeds[crop.id] ?? 0)
      tutorial = crop.id === 'wheat' ? Math.min(eligible.length, farm.tutorialRemaining) : 0
    }
    return {
      revision: snapshot.revision,
      operation: 'plotIds' in operation ? { ...operation, plotIds: eligible } : operation,
      eligible: eligible.length, tutorial, normal: eligible.length - tutorial,
      seedCost: operation.type === 'sow' ? eligible.length : 0
    }
  }

  get storageError(): string | null { return this.saveError }

  recordManualActivity(): void {
    const snapshot = this.project()
    snapshot.farm!.assistant = { ...snapshot.farm!.assistant, successfulActions: 0, restUntil: 0, lastManualAt: this.clock.wall() }
    this.persist(snapshot)
    this.anchor(snapshot)
  }

  lifeTransaction(expectedRevision: number, change: (_data: FarmLifeData, _farm: FarmState, _feedback?: import('../../types/farm').FarmFeedback) => void, operation?: FarmOperation): FarmView {
    const snapshot = this.project()
    if (snapshot.revision !== expectedRevision) throw new Error('资源已变化，请刷新后重新确认')
    if (operation) {
      if (!('plotIds' in operation) || !operation.plotIds.length || safeHelp(snapshot.farm!, snapshot.cash, operation, this.clock.wall()).length !== operation.plotIds.length) throw new Error('这次操作留给玩家亲自完成')
      const outcome = applyOperation(snapshot.farm!, snapshot.cash, operation, this.clock.wall(), 'helper')
      snapshot.cash = outcome.cash
      change(ensureFarmLife(snapshot.farm!, this.clock.wall()), snapshot.farm!, outcome.feedback)
    } else change(ensureFarmLife(snapshot.farm!, this.clock.wall()), snapshot.farm!)
    validateFarm(snapshot.farm)
    snapshot.revision++
    this.persist(snapshot)
    this.anchor(snapshot)
    return this.view(snapshot)
  }

  execute(command: FarmCommand, assistant?: FarmAssistantMetadata): FarmResult {
    if (!command || typeof command.requestId !== 'string' || !command.requestId || command.requestId.length > 120 || !Number.isSafeInteger(command.expectedRevision) || !command.operation) throw new Error('农场请求无效')
    const fingerprint = JSON.stringify(command.operation)
    const durable = this.current()
    const receipt = durable.receipts.find(entry => entry.requestId === command.requestId)
    if (receipt) {
      if (receipt.fingerprint !== fingerprint) throw new Error('请求编号已经用于其他操作')
      return { view: this.getView(), feedback: receipt.feedback }
    }
    if (command.expectedRevision !== durable.revision) throw new Error('资源已变化，请刷新后重新确认')
    if (this.saveError) {
      // A retry probes storage before accepting a new resource mutation.
      this.persist(durable)
    }
    const snapshot = this.project()
    const outcome = applyOperation(snapshot.farm!, snapshot.cash, command.operation, this.clock.wall(), assistant ? 'helper' : 'player')
    snapshot.cash = outcome.cash
    snapshot.farm!.assistant = assistant ?? { ...snapshot.farm!.assistant, successfulActions: 0, restUntil: 0, lastManualAt: this.clock.wall() }
    validateFarm(snapshot.farm)
    snapshot.revision++
    snapshot.receipts = [...snapshot.receipts, { requestId: command.requestId, fingerprint, feedback: outcome.feedback }].slice(-128)
    this.persist(snapshot)
    this.anchor(snapshot)
    return { view: this.view(snapshot), feedback: outcome.feedback }
  }
}
