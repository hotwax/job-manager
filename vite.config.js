/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { ideTraceVue } from 'chrome-ide-trace/vite'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { versionInfoUtil } from '../../common/utils/versionInfoUtil'
import { commonEnvPlugin } from '../../common/vite/commonEnvPlugin'
import pkg from './package.json'
import manifest from './manifest.json'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const appBuild = JSON.parse(env.VITE_APP_VERSION_CONFIG).buildVersion
  return {
  // A version build (buildVersion vX.Y.Z in VITE_APP_VERSION_CONFIG) is self-contained under /vX.Y.Z/; an empty buildVersion is the root bootstrap.
  base: appBuild ? `/${appBuild}/` : '/',
  build: {
    outDir: appBuild ? `dist/${appBuild}` : 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@ionic') || id.includes('ionicons')) {
              return 'vendor-ionic'
            }
            if (id.includes('vue') || id.includes('pinia')) {
              return 'vendor-vue'
            }
            if (id.includes('dexie') || id.includes('idb')) {
              return 'vendor-db'
            }
            if (id.includes('luxon')) {
              return 'vendor-luxon'
            }
          }
          if (id.includes('/common/')) {
            return 'common'
          }
        }
      }
    }
  },
  plugins: [
    commonEnvPlugin(),
    ideTraceVue(),
    vue(),
    legacy(),
    VitePWA({
      registerType: "autoUpdate",
      selfDestroying: true,
      manifest: manifest,
      devOptions: {
        enabled: true
      }
    })
  ],
  define: {
    'import.meta.env.VITE_APP_VERSION_INFO': JSON.stringify(JSON.stringify(versionInfoUtil.getVersionInfo(pkg.version)))
  },
  resolve: {
    dedupe: ['vue', 'vue-router', '@ionic/vue', '@ionic/vue-router', 'pinia', 'vue-i18n'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@common': path.resolve(__dirname, '../../common')
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/.claude/**']
  }
  }
})
