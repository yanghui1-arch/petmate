import { randomUUID } from 'node:crypto'
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export function readJson(path: string): unknown { return JSON.parse(readFileSync(path, 'utf8')) }

// Never fall back to overwriting the live file: a failed replacement keeps it intact.
export function writeJsonAtomic(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  const temporary = `${path}.${randomUUID()}.tmp`
  let fd: number | undefined
  try {
    fd = openSync(temporary, 'wx', 0o600)
    writeFileSync(fd, JSON.stringify(value, null, 2), 'utf8')
    fsyncSync(fd)
    closeSync(fd)
    fd = undefined
    renameSync(temporary, path)
  } finally {
    if (fd !== undefined) closeSync(fd)
    if (existsSync(temporary)) unlinkSync(temporary)
  }
}
