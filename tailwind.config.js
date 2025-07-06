import { defineConfig } from '@tailwindcss/vite'

export default defineConfig({
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{vue,js,ts,jsx,tsx}"
  ]
})