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

// Package name from the last node_modules segment of a module id, so a pnpm store path like
// .pnpm/@vue+devtools-kit@x/node_modules/mitt resolves to "mitt" and not to anything named "vue".
function packageName(id) {
  const index = id.lastIndexOf('/node_modules/')
  if (index < 0) return undefined
  const [scopeOrName, name] = id.slice(index + '/node_modules/'.length).split('/')
  return scopeOrName.startsWith('@') ? `${scopeOrName}/${name}` : scopeOrName
}

const VENDOR_IONIC = new Set(['@ionic/core', 'ionicons', '@stencil/core'])
const VENDOR_FRAMEWORK = new Set(['vue', 'vue-router', 'pinia', 'pinia-plugin-persistedstate', 'vue-i18n', '@ionic/vue', '@ionic/vue-router'])

// A module is eager when an entry reaches it through static imports alone, i.e. it loads at startup.
const eagerModules = new Map()
function isEager(id, getModuleInfo) {
  if (eagerModules.has(id)) return eagerModules.get(id)
  eagerModules.set(id, false) // breaks import cycles while the answer is computed
  const info = getModuleInfo(id)
  const eager = !!info && (info.isEntry || info.importers.some(importer => isEager(importer, getModuleInfo)))
  eagerModules.set(id, eager)
  return eager
}

// Third-party code that rarely changes goes in its own chunks; app and @common code stay with Rollup's
// per-route splitting. Vite's runtime helpers get their own chunk so no vendor chunk imports back from
// app code, which would create a chunk cycle and break startup ("Cannot access X before initialization").
function manualChunks(id, { getModuleInfo }) {
  if (id.includes('vite/preload-helper') || id.includes('commonjsHelpers')) return 'vendor-runtime'
  const pkg = packageName(id)
  if (!pkg) return undefined
  if (VENDOR_IONIC.has(pkg)) return 'vendor-ionic'
  if (VENDOR_FRAMEWORK.has(pkg) || pkg.startsWith('@vue/') || pkg.startsWith('@intlify/')) return 'vendor-framework'
  // Only packages needed at startup; a package used only by a lazy route stays with that route.
  if (isEager(id, getModuleInfo)) return 'vendor-libs'
  return undefined
}

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
      output: { manualChunks }
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
