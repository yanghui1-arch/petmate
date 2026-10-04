import type { LabApi } from './types'
declare global {
    interface Window {
        farmLab: LabApi & { ready(): void; interaction(): void }
    }
}
