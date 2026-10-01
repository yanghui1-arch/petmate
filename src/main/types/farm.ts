export type CropDefinition = {
  id: string; name: string; level: number; minutes: number; price: number;
  yield: number; sell: number; exp: number; description: string
}
export type DecorationDefinition = { id: string; name: string; level: number; price: number; width: number }
export type OrderDefinition = { id: string; level: number; requirements: Record<string, number>; exp: number; size: number }
export type FarmCatalog = { crops: CropDefinition[]; decorations: DecorationDefinition[]; orders: OrderDefinition[]; levels: number[] }
export type FarmPlant = { cropId: string; plantedAt: number; durationMs: number; elapsedMs: number; watered: boolean }
export type FarmPlot = { id: number; plant: FarmPlant | null }
export type FarmOrder = { instanceId: string; templateId: string } | { remainingMs: number }
export type PlacedDecoration = { instanceId: string; decorationId: string; region: 'left' | 'right' | 'bottom'; x: number; y: number }
export type FarmState = {
  version: 1; tutorialRemaining: number; exp: number; lastWallTime: number;
  plots: FarmPlot[]; seeds: Record<string, number>; produce: Record<string, number>;
  decorations: Record<string, number>; harvests: Record<string, number>;
  orders: FarmOrder[]; placed: PlacedDecoration[]
}
export type FarmOperation =
  | { type: 'sow'; cropId: string; plotIds: number[] }
  | { type: 'water' | 'harvest'; plotIds: number[] }
  | { type: 'buySeed' | 'sell'; cropId: string; count: number }
  | { type: 'buyDecoration'; decorationId: string; count: number }
  | { type: 'deliver' | 'discard'; instanceId: string }
  | { type: 'place'; decorationId: string; region: PlacedDecoration['region']; x: number; y: number }
  | { type: 'move'; instanceId: string; region: PlacedDecoration['region']; x: number; y: number }
  | { type: 'reclaim'; instanceId: string }
export type FarmCommand = { requestId: string; expectedRevision: number; operation: FarmOperation }
export type FarmFeedback = { message: string; items: Record<string, number>; exp: number; cashDelta: number; kind: 'sow' | 'water' | 'harvest' | 'other' }
export type FarmReceipt = { requestId: string; fingerprint: string; feedback: FarmFeedback }
export type FarmSnapshot = { farm: FarmState | null; cash: number; revision: number; receipts: FarmReceipt[] }
export type FarmView = FarmSnapshot & { catalog: FarmCatalog; level: number; unlockedPlots: number; saveError: string | null }
export type FarmPreview = { revision: number; operation: FarmOperation; eligible: number; tutorial: number; normal: number; seedCost: number }
export type FarmResult = { view: FarmView; feedback: FarmFeedback }
export type BackupPreview = { token: string; createdAt: string; level: number; cash: number; scope: string; automatic: boolean }
