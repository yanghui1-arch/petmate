import type { FarmFeedback, FarmOperation, FarmPlant, FarmState } from '../../types/farm'
import { farmCatalog, farmLevel, getCrop, getOrder, orderCash, unlockedPlots } from './catalog'

export const ORDER_WAIT_MS = 30 * 60_000
export const TUTORIAL_MS = 5 * 60_000
export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
export function positiveInteger(value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('数量必须是正整数')
}
export function createFarm(now: number, id: () => string): FarmState {
  return {
    version: 1, tutorialRemaining: 6, exp: 0, lastWallTime: now,
    plots: Array.from({ length: 12 }, (_, index) => ({ id: index, plant: null })),
    seeds: { wheat: 6, carrot: 6 }, produce: {}, harvests: {},
    orders: ['wheat-small', 'carrot-small', 'wheat-carrot'].map(templateId => ({ instanceId: id(), templateId }))
  }
}
export function plantProgress(plant: FarmPlant): number {
  return Math.min(1, (plant.elapsedMs + (plant.watered ? plant.durationMs * 0.2 : 0)) / plant.durationMs)
}
export function plantStage(plant: FarmPlant): number {
  const progress = plantProgress(plant)
  return progress >= 1 ? 3 : progress >= 0.5 ? 2 : progress >= 0.1 ? 1 : 0
}
export function growFarm(farm: FarmState, elapsedMs: number, now: number, id: () => string, random: () => number): void {
  const delta = Math.max(0, elapsedMs)
  for (const plot of farm.plots) {
    if (plot.plant) plot.plant.elapsedMs = Math.min(plot.plant.durationMs, plot.plant.elapsedMs + delta)
  }
  for (let index = 0; index < farm.orders.length; index++) {
    const slot = farm.orders[index]
    if (!('remainingMs' in slot)) continue
    slot.remainingMs = Math.max(0, slot.remainingMs - delta)
    if (slot.remainingMs > 0) continue
    const active = farm.orders.flatMap(order => 'templateId' in order ? [getOrder(order.templateId)] : [])
    const used = new Set(active.map(order => order.id))
    const missing = [1, 2, 3].filter(size => !active.some(order => (order.size >= 3 ? 3 : order.size) === size))
    const available = farmCatalog.orders.filter(order => order.level <= farmLevel(farm.exp) && !used.has(order.id))
    const preferred = available.filter(order => missing.includes(order.size >= 3 ? 3 : order.size))
    const pool = preferred.length ? preferred : available
    if (!pool.length) continue
    const template = pool[Math.min(pool.length - 1, Math.floor(Math.max(0, Math.min(0.999999, random())) * pool.length))]
    farm.orders[index] = { instanceId: id(), templateId: template.id }
  }
  farm.lastWallTime = Math.max(farm.lastWallTime, now)
}
export function eligiblePlots(farm: FarmState, operation: FarmOperation): number[] {
  if (!('plotIds' in operation)) return []
  if (!Array.isArray(operation.plotIds) || operation.plotIds.length > 12 || new Set(operation.plotIds).size !== operation.plotIds.length) throw new Error('地块选择无效')
  if (operation.plotIds.some(id => !Number.isInteger(id) || id < 0 || id >= unlockedPlots(farm.exp))) throw new Error('地块尚未开放')
  return operation.plotIds.filter(id => {
    const plant = farm.plots[id].plant
    return operation.type === 'sow' ? !plant : operation.type === 'water' ? !!plant && !plant.watered && plantProgress(plant) < 1 : !!plant && plantProgress(plant) >= 1
  })
}
export function applyOperation(farm: FarmState, cash: number, operation: FarmOperation, now: number): { cash: number; feedback: FarmFeedback } {
  const feedback: FarmFeedback = { message: '', items: {}, exp: 0, cashDelta: 0, kind: 'other' }
  const add = (target: Record<string, number>, key: string, count: number) => { target[key] = (target[key] ?? 0) + count }
  const level = farmLevel(farm.exp)
  if (operation.type === 'sow' || operation.type === 'water' || operation.type === 'harvest') {
    const plots = eligiblePlots(farm, operation)
    if (!plots.length) throw new Error('没有符合条件的地块')
    if (operation.type === 'sow') {
      const crop = getCrop(operation.cropId)
      if (crop.level > level) throw new Error('作物尚未解锁')
      if ((farm.seeds[crop.id] ?? 0) < plots.length) throw new Error('种子不足，请重新预览可播种数量')
      for (const plotId of plots) {
        const tutorial = crop.id === 'wheat' && farm.tutorialRemaining > 0
        if (tutorial) farm.tutorialRemaining--
        farm.plots[plotId].plant = { cropId: crop.id, plantedAt: now, durationMs: tutorial ? TUTORIAL_MS : crop.minutes * 60_000, elapsedMs: 0, watered: false }
      }
      add(farm.seeds, crop.id, -plots.length)
      feedback.message = `播种了 ${plots.length} 块${crop.name}`
      feedback.kind = 'sow'
    } else if (operation.type === 'water') {
      for (const plotId of plots) farm.plots[plotId].plant!.watered = true
      feedback.message = `为 ${plots.length} 块地浇了水`
      feedback.kind = 'water'
    } else {
      for (const plotId of plots) {
        const crop = getCrop(farm.plots[plotId].plant!.cropId)
        add(farm.produce, crop.id, crop.yield)
        add(farm.harvests, crop.id, crop.yield)
        add(feedback.items, crop.id, crop.yield)
        feedback.exp += crop.exp
        farm.plots[plotId].plant = null
      }
      farm.exp += feedback.exp
      feedback.message = `收获了 ${plots.length} 块地的作物`
      feedback.kind = 'harvest'
    }
  } else if (operation.type === 'buySeed' || operation.type === 'sell') {
    positiveInteger(operation.count)
    const crop = getCrop(operation.cropId)
    if (operation.type === 'buySeed') {
      if (crop.level > level) throw new Error('作物尚未解锁')
      const cost = crop.price * operation.count
      if (!Number.isSafeInteger(cost) || cost > cash) throw new Error('货币不足')
      add(farm.seeds, crop.id, operation.count)
      feedback.cashDelta = -cost
      feedback.message = `购买了 ${operation.count} 份${crop.name}种子`
    } else {
      if ((farm.produce[crop.id] ?? 0) < operation.count) throw new Error('作物库存不足')
      add(farm.produce, crop.id, -operation.count)
      feedback.cashDelta = crop.sell * operation.count
      feedback.message = `出售了 ${operation.count} 个${crop.name}`
    }
  } else if (operation.type === 'deliver' || operation.type === 'discard') {
    const index = farm.orders.findIndex(order => 'instanceId' in order && order.instanceId === operation.instanceId)
    if (index < 0) throw new Error('订单已完成或不存在，请刷新')
    const slot = farm.orders[index]
    if (!('templateId' in slot)) throw new Error('订单正在补充')
    const order = getOrder(slot.templateId)
    if (operation.type === 'deliver') {
      if (Object.entries(order.requirements).some(([crop, count]) => (farm.produce[crop] ?? 0) < count)) throw new Error('订单材料不足')
      for (const [crop, count] of Object.entries(order.requirements)) add(farm.produce, crop, -count)
      feedback.cashDelta = orderCash(order.id)
      feedback.exp = order.exp
      farm.exp += order.exp
      feedback.message = '订单已交付，奖励已保存'
    } else feedback.message = '已放弃订单，30 分钟后补充'
    farm.orders[index] = { remainingMs: ORDER_WAIT_MS }
  } else throw new Error('不支持的农场操作')
  const newCash = cash + feedback.cashDelta
  if (!Number.isFinite(newCash) || newCash < 0 || newCash > Number.MAX_SAFE_INTEGER) throw new Error('货币数值超出范围')
  validateFarm(farm)
  return { cash: newCash, feedback }
}
export function validateFarm(value: unknown): asserts value is FarmState {
  const farm = value as FarmState
  if (farm?.assistant !== undefined && (!farm.assistant || typeof farm.assistant !== 'object' || !Number.isInteger(farm.assistant.successfulActions) || farm.assistant.successfulActions < 0 || farm.assistant.successfulActions >= 6 || !Number.isFinite(farm.assistant.restUntil) || farm.assistant.restUntil < 0 || !Number.isFinite(farm.assistant.lastManualAt) || farm.assistant.lastManualAt < 0)) throw new Error('农场助手状态无效')
  const nonnegative = (number: number) => Number.isSafeInteger(number) && number >= 0
  if (!farm || farm.version !== 1 || !nonnegative(farm.exp) || !nonnegative(farm.tutorialRemaining) || farm.tutorialRemaining > 6 || !nonnegative(farm.lastWallTime)) throw new Error('农场存档格式无效')
  if (!Array.isArray(farm.plots) || farm.plots.length !== 12) throw new Error('地块存档无效')
  const cropIds = new Set(farmCatalog.crops.map(crop => crop.id))
  for (const name of ['seeds', 'produce', 'harvests'] as const) {
    const allowed = cropIds
    if (!farm[name] || Array.isArray(farm[name]) || Object.entries(farm[name]).some(([key, count]) => !allowed.has(key) || !nonnegative(count))) throw new Error('仓库存档无效')
  }
  farm.plots.forEach((plot, index) => {
    if (plot.id !== index || (plot.plant && index >= unlockedPlots(farm.exp))) throw new Error('地块编号无效')
    if (plot.plant) {
      const plant = plot.plant
      const crop = getCrop(plant.cropId)
      if (crop.level > farmLevel(farm.exp) || !nonnegative(plant.plantedAt) || !Number.isFinite(plant.elapsedMs) || plant.elapsedMs < 0 || plant.elapsedMs > plant.durationMs || typeof plant.watered !== 'boolean' || ![crop.minutes * 60_000, ...(crop.id === 'wheat' ? [TUTORIAL_MS] : [])].includes(plant.durationMs)) throw new Error('作物成长记录无效')
    } else if (plot.plant !== null) throw new Error('空地记录无效')
  })
  if (!Array.isArray(farm.orders) || farm.orders.length !== 3) throw new Error('订单存档无效')
  const instances = new Set<string>()
  const templates = new Set<string>()
  for (const order of farm.orders) {
    if ('templateId' in order) {
      if (typeof order.instanceId !== 'string' || !order.instanceId || instances.has(order.instanceId) || templates.has(order.templateId) || getOrder(order.templateId).level > farmLevel(farm.exp)) throw new Error('订单记录无效')
      instances.add(order.instanceId); templates.add(order.templateId)
    } else if (!Number.isFinite(order.remainingMs) || order.remainingMs < 0 || order.remainingMs > ORDER_WAIT_MS) throw new Error('补单时间无效')
  }
}
