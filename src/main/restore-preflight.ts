import { app } from 'electron'

import { recoverInterruptedRestore } from './modules/save/backup'
import { recordStartup } from './startupDiagnostics'

// This module must be imported before any Store-backed manager is constructed.
recordStartup('restore-preflight-start')
recoverInterruptedRestore(app.getPath('userData'))
recordStartup('restore-preflight-complete')
