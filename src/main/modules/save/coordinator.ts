let frozen = false

export function assertGameWritable(): void {
  if (frozen) throw new Error('正在恢复完整存档，请等待应用重新加载')
}
export function freezeGameWrites(value: boolean): void { frozen = value }
export function gameWritesFrozen(): boolean { return frozen }
