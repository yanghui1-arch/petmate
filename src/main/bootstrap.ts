import { app } from 'electron'

import { diagnosticError, installStartupDiagnostics, recordStartup } from './startupDiagnostics'

installStartupDiagnostics()
recordStartup('business-modules-loading')
// Load third-party native modules and stores only after early diagnostics exist.
void import('./index')
    .then(() => {
        recordStartup('business-modules-loaded')
    })
    .catch((error) => {
        recordStartup('business-modules-failed', { error: diagnosticError(error) })
        console.error('Petmate startup failed:', error)
        app.exit(1)
    })
