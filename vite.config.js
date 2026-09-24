/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { ideTraceVue } from 'chrome-ide-trace/vite'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { versionInfoUtil } from '../../common/utils/versionInfoUtil'
import pkg from './package.json'
import manifest from './manifest.json'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const versionConfig = env.VITE_APP_VERSION_CONFIG || (mode === 'test' ? '{"buildVersion":""}' : undefined)
  if (!versionConfig) throw new Error('VITE_APP_VERSION_CONFIG is required outside test mode')
  const appBuild = JSON.parse(versionConfig).buildVersion
  return {
  // A version build (buildVersion vX.Y.Z in VITE_APP_VERSION_CONFIG) is self-contained under /vX.Y.Z/; an empty buildVersion is the root bootstrap.
  base: appBuild ? `/${appBuild}/` : '/',
  build: {
    outDir: appBuild ? `dist/${appBuild}` : 'dist'
  },
  plugins: [
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
    environment: 'jsdom'
  }
  }
})
