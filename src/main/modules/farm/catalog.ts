import data from '../../../../resources/data/farm.json'
import type { FarmCatalog } from '../../types/farm'

export const farmCatalog: FarmCatalog = {
  ...data,
  orders: data.orders.map(order => ({ ...order, requirements: Object.fromEntries(Object.entries(order.requirements).filter(([, count]) => count !== undefined)) }))
}

export function getCrop(id: string) {
  const crop = farmCatalog.crops.find(entry => entry.id === id)
  if (!crop) throw new Error('未找到作物')
  return crop
}
export function getDecoration(id: string) {
  const decoration = farmCatalog.decorations.find(entry => entry.id === id)
  if (!decoration) throw new Error('未找到装饰')
  return decoration
}
export function getOrder(id: string) {
  const order = farmCatalog.orders.find(entry => entry.id === id)
  if (!order) throw new Error('未找到订单模板')
  return order
}
export function orderCash(id: string): number {
  return Math.ceil(Object.entries(getOrder(id).requirements).reduce((sum, [crop, count]) => sum + getCrop(crop).sell * count, 0) * 1.25)
}
export function farmLevel(exp: number): number {
  return farmCatalog.levels.filter(threshold => exp >= threshold).length
}
export function unlockedPlots(exp: number): number {
  return farmLevel(exp) >= 5 ? 12 : farmLevel(exp) >= 3 ? 9 : 6
}
