import { i18n } from '../i18n'
import type { ActivityInfo, Buff, Item, Wish, WishRequirement, WishReward } from '../types/common'

const WISH_SOURCE_IDS: Record<string, string> = {
  '甜点套餐': '0',
  '肆意玩耍': '1',
  '睡觉，睡觉，还是睡觉！': '2',
  '工作狂': '3',
}

function translateContent(key: string, fallback: string): string {
  // Keep the current locale as a dependency for callers that use this helper in computed values.
  void i18n.global.locale.value
  return i18n.global.te(key) ? i18n.global.t(key) : fallback
}

export function getPetmateName(name?: string): string {
  if (!name || name === '尤美' || name === '黛丝' || name === 'Youmei') return i18n.global.t('common.petmate')
  return name
}

export function getActivityName(activity: Pick<ActivityInfo, 'id' | 'name'>): string {
  return translateContent(`content.activities.${activity.id}.name`, activity.name)
}

export function getActivityDescription(activity: Pick<ActivityInfo, 'id' | 'description'>): string {
  return translateContent(`content.activities.${activity.id}.description`, activity.description)
}

export function getActivityRewardSummary(activity: Pick<ActivityInfo, 'id' | 'rewardSummary'>): string {
  return translateContent(`content.activities.${activity.id}.rewardSummary`, activity.rewardSummary)
}

export function getItemName(item: Pick<Item, 'id' | 'name'>): string {
  return translateContent(`content.items.${item.id}.name`, item.name)
}

export function getItemDescription(item: Pick<Item, 'id' | 'description'>): string {
  return translateContent(`content.items.${item.id}.description`, item.description)
}

export function getBuffName(buff: Pick<Buff, 'id' | 'name'>): string {
  return translateContent(`content.buffs.${buff.id}.name`, buff.name)
}

export function getBuffDescription(buff: Pick<Buff, 'id' | 'description'>): string {
  return translateContent(`content.buffs.${buff.id}.description`, buff.description)
}

export function getWishName(wish: Pick<Wish, 'id' | 'name'>): string {
  const numericId = wish.id.match(/^\d+$/)?.[0]
  const sourceId = numericId ?? WISH_SOURCE_IDS[wish.name]
  return sourceId ? translateContent(`content.wishes.${sourceId}.name`, wish.name) : wish.name
}

export function getWishNameFromSource(name: string): string {
  const id = WISH_SOURCE_IDS[name]
  return id ? translateContent(`content.wishes.${id}.name`, name) : name
}

export function getWishRequirementName(requirement: WishRequirement): string {
  if (requirement.type === 'item') return getItemName(requirement)
  return getActivityName({ id: requirement.id, name: requirement.name })
}

export function getWishRewardName(reward: WishReward): string {
  if (reward.type === 'item') return getItemName(reward)
  return getBuffName(reward)
}
