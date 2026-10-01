import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const project = dirname(dirname(fileURLToPath(import.meta.url)))
const sdk = process.env.STEAMWORKS_SDK_PATH || join(project, 'steamworks_sdk')
const environment = { ...process.env }

if (process.platform === 'win32' && existsSync(join(sdk, 'public', 'steam', 'isteamutils.h'))) {
  environment.STEAMWORKS_SDK_PATH = sdk
  const header = readFileSync(join(sdk, 'public', 'steam', 'isteamutils.h'), 'utf8')
  const sourcePath = join(project, 'node_modules', 'greenworks', 'src', 'api', 'steam_api_settings.cc')
  if (existsSync(sourcePath) && header.includes('IsRunningOnSteamHardware()')) {
    const oldCall = 'SteamUtils()->IsSteamRunningOnSteamDeck()'
    const newCall = 'SteamUtils()->IsRunningOnSteamHardware() == k_ESteamHardwareTypeSteamDeck'
    const source = readFileSync(sourcePath, 'utf8')
    if (source.includes(oldCall)) {
      writeFileSync(sourcePath, source.replace(oldCall, newCall))
      console.log('Adjusted greenworks for Steamworks SDK 1.65 hardware detection')
    }
  }
}

const args = process.argv.slice(2)
if (args.length === 0) throw new Error('Pass install-app-deps or --dir')
if (args.includes('--dir') && process.platform === 'win32') {
  const localElectron = join(project, 'node_modules', 'electron', 'dist', 'electron.exe')
  if (existsSync(localElectron)) args.push('--config.electronDist=node_modules/electron/dist')
  // An unpacked verification build does not need signing or Windows resource editing.
  args.push('--config.win.signAndEditExecutable=false')
}

const builder = join(project, 'node_modules', 'electron-builder', 'cli.js')
const result = spawnSync(process.execPath, [builder, ...args], {
  cwd: project,
  env: environment,
  stdio: 'inherit'
})
if (result.error) throw result.error
process.exit(result.status ?? 1)
