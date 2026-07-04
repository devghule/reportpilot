import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Served by the backend at /sidebar/index.html, not site root — asset
  // references in the built index.html need this prefix or they 404.
  base: '/sidebar/',
  build: {
    outDir: '../backend/public/sidebar',
    emptyOutDir: true,
  },
  server: { port: 5173 },
})
