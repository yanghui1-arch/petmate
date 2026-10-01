import { app } from 'electron'

import { recoverInterruptedRestore } from './modules/save/backup'

// This module must be imported before any Store-backed manager is constructed.
recoverInterruptedRestore(app.getPath('userData'))
