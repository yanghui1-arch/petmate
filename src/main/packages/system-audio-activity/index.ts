import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import logger from '../../log'
import windowsAudioMeterScript from './windows-audio-meter.ps1?raw'

type AudioActivityListener = (active: boolean, peak: number) => void

const ACTIVE_PEAK_THRESHOLD = 0.008
const ACTIVE_MASTER_VOLUME_THRESHOLD = 0.35
const SILENCE_HOLD_MS = 700
const POWERSHELL_COMMAND = 'powershell.exe'

export class SystemAudioActivityMonitor {
    private child: ChildProcessWithoutNullStreams | null = null
    private outputBuffer = ''
    private active = false
    private silenceStartedAt: number | null = null
    private listener: AudioActivityListener | null = null

    start(listener: AudioActivityListener): void {
        this.listener = listener
        if (process.platform !== 'win32' || this.child) return

        const encodedScript = Buffer.from(windowsAudioMeterScript, 'utf16le').toString('base64')
        this.child = spawn(POWERSHELL_COMMAND, [
            '-NoProfile',
            '-ExecutionPolicy',
            'Bypass',
            '-EncodedCommand',
            encodedScript
        ], {
            windowsHide: true
        })

        this.child.stdout.on('data', (data: Buffer) => {
            this.readPeaks(data.toString('utf8'))
        })

        this.child.stderr.on('data', (data: Buffer) => {
            logger.warn(`[system-audio-activity] ${data.toString('utf8').trim()}`)
        })

        this.child.once('exit', (code, signal) => {
            this.child = null
            this.updateActive(false, 0)
            if (code !== 0 && signal !== 'SIGTERM') {
                logger.warn(`[system-audio-activity] monitor exited: code=${code}, signal=${signal}`)
            }
        })
    }

    stop(): void {
        if (!this.child) return

        const child = this.child
        this.child = null
        child.removeAllListeners()
        child.kill()
        this.updateActive(false, 0)
    }

    isActive(): boolean {
        return this.active
    }

    private readPeaks(chunk: string): void {
        this.outputBuffer += chunk
        const lines = this.outputBuffer.split(/\r?\n/)
        this.outputBuffer = lines.pop() ?? ''

        for (const line of lines) {
            const [peakText, volumeText, mutedText] = line.split(',')
            const peak = Number.parseFloat(peakText)
            const volume = Number.parseFloat(volumeText)
            if (Number.isFinite(peak) && Number.isFinite(volume)) {
                this.handleSample(peak, volume, mutedText === '1')
            }
        }
    }

    private handleSample(peak: number, volume: number, muted: boolean): void {
        // Keep a small release delay so quiet gaps between beats do not flicker idle/dance.
        if (!muted && volume >= ACTIVE_MASTER_VOLUME_THRESHOLD && peak >= ACTIVE_PEAK_THRESHOLD) {
            this.silenceStartedAt = null
            this.updateActive(true, peak)
            return
        }

        if (!this.active) return

        const now = Date.now()
        this.silenceStartedAt ??= now
        if (now - this.silenceStartedAt >= SILENCE_HOLD_MS) {
            this.silenceStartedAt = null
            this.updateActive(false, peak)
        }
    }

    private updateActive(active: boolean, peak: number): void {
        if (this.active === active) return

        this.active = active
        this.listener?.(active, peak)
    }
}
