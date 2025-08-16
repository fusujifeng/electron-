import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
// @ts-ignore
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        path: 'path-browserify'
      }
    },
    plugins: [vue(), tailwindcss()],
    define: {
      __dirname: 'import.meta.dirname',
      __filename: 'import.meta.filename',
      global: 'globalThis'
    },
    optimizeDeps: {
      exclude: ['electron']
    }
  }
})
