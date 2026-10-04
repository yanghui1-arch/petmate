import type { FarmLifeEvent } from '../../shared/farmLife'
import { farmLifeCN } from '../i18n/farm-life'
export function farmLifeLine(
    event: FarmLifeEvent,
    stage: 'start' | 'return' | 'diary',
    t: (_key: string, _values?: Record<string, unknown>) => string
) {
    if (stage !== 'start' && event.interrupted) return t('farmLife.interrupted')
    const variants = farmLifeCN[stage][event.kind].length
    // Pick independently for speech and diary; an event keeps its wording on rerender/reentry.
    let seed = event.line
    if (stage !== 'start')
        for (const letter of `${event.id}:${stage}`)
            seed = (Math.imul(seed, 31) + letter.charCodeAt(0)) >>> 0
    const line = seed % variants
    return (
        t(`farmLife.${stage}.${event.kind}.${line}`, { count: event.plots }) +
        (stage !== 'start' && event.orderReady ? ' ' + t('farmLife.ready') : '')
    )
}
