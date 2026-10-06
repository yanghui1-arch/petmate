import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import AutoImport from 'unplugin-auto-import/vite';
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import glsl from 'vite-plugin-glsl';

export default defineConfig(({ command }) => ({
  main: {
    plugins: [externalizeDepsPlugin()],
    publicDir: false,
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer'),
        '@renderer': resolve('src/renderer'),
      }
    },
    plugins: [
      vue(),
      glsl(),
      AutoImport({
        imports: [
          'vue',
          {
            'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar']
          }
        ]
      }),
      Components({
        // Keep type generation in development; parallel production transforms
        // can compete for this file on Windows.
        dts: command === 'serve',
        resolvers: [NaiveUiResolver()]
      })
    ],
    assetsInclude: ['**/*.glb', '**/*.gltf'],
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/assets/style/color.scss" as *;`,
        },
      },
    },
    publicDir: false,
    build: {
        assetsInlineLimit: 0
    }
  }
}))
