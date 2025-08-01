import { vi } from 'vitest'

// 全局模拟electron的主进程API
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
  },
  app: {
    whenReady: vi.fn(() => Promise.resolve()),
    on: vi.fn(),
    quit: vi.fn()
  },
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadURL: vi.fn(),
    on: vi.fn(),
    getAllWindows: vi.fn(() => [])
  }))
}))

// Mock the main index.ts to prevent it from executing during tests
vi.mock('../src/main/index.ts', () => ({
  getMainWindow: vi.fn(() => null)
}))

// Mock Electron APIs for testing
const mockElectronAPI = {
  getAppVersion: vi.fn(),
  getSettings: vi.fn(),
  saveSettings: vi.fn(),
  onSettingsUpdate: vi.fn(),
  // Add more API mocks as needed based on your actual API
}

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
})

// Mock matchMedia for CSS media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
}) 