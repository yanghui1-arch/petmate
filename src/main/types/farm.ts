export type CropDefinition = {
  id: string; name: string; level: number; minutes: number; price: number;
  yield: number; sell: number; exp: number; description: string
}
export type OrderDefinition = { id: string; level: number; requirements: Record<string, number>; exp: number; size: number }
export type FarmCatalog = { crops: CropDefinition[]; orders: OrderDefinition[]; levels: number[] }
export type FarmPlant = { cropId: string; plantedAt: number; durationMs: number; elapsedMs: number; watered: boolean }
export type FarmPlot = { id: number; plant: FarmPlant | null }
export type FarmOrder = { instanceId: string; templateId: string } | { remainingMs: number }
export type FarmAchievementState = { harvestedPlots: Record<string, number>; completedOrders: number; unlocked: string[] }
export type FarmState = {
  version: 1; tutorialRemaining: number; exp: number; lastWallTime: number;
  plots: FarmPlot[]; seeds: Record<string, number>; produce: Record<string, number>;
  harvests: Record<string, number>;
  orders: FarmOrder[]
  assistant?: FarmAssistantMetadata
  achievements?: FarmAchievementState
}
export type FarmAssistantMetadata = { successfulActions: number; restUntil: number; lastManualAt: number }
export type FarmAssistantStatus = { state: 'waitingPlayer' | 'working' | 'waitingGrowth' | 'waitingOrders' | 'missingSeeds' | 'resting' | 'paused' | 'saveError'; orderId?: string }
export type FarmAssistantEvent = { id: string; kind: 'started' | 'resting' | 'harvested' | 'delivered' | 'missingSeeds'; at: number }
export type FarmOperation =
  | { type: 'sow'; cropId: string; plotIds: number[] }
  | { type: 'water' | 'harvest'; plotIds: number[] }
  | { type: 'buySeed' | 'sell'; cropId: string; count: number }
  | { type: 'deliver' | 'discard'; instanceId: string }
export type FarmCommand = { requestId: string; expectedRevision: number; operation: FarmOperation }
export type FarmFeedback = { message: string; items: Record<string, number>; exp: number; cashDelta: number; kind: 'sow' | 'water' | 'harvest' | 'other' }
export type FarmReceipt = { requestId: string; fingerprint: string; feedback: FarmFeedback }
export type FarmSnapshot = { farm: FarmState | null; cash: number; revision: number; receipts: FarmReceipt[] }
export type FarmView = FarmSnapshot & { catalog: FarmCatalog; level: number; unlockedPlots: number; saveError: string | null }
export type FarmPreview = { revision: number; operation: FarmOperation; eligible: number; tutorial: number; normal: number; seedCost: number }
export type FarmResult = { view: FarmView; feedback: FarmFeedback }
export type BackupPreview = { token: string; createdAt: string; level: number; cash: number; scope: string; automatic: boolean }
