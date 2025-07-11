import { vi } from 'vitest'

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