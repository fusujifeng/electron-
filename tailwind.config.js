import { defineConfig } from '@tailwindcss/vite'

export default defineConfig({
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{vue,js,ts,jsx,tsx}"
  ],
  safelist: [
    'grid-cols-1',
    'grid-cols-2', 
    'grid-cols-3',
    'grid-cols-4',
    'grid-cols-5',
    'grid-cols-6'
  ]
})