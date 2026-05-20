import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const LOCAL_HOST = '127.0.0.1'
const DEV_PORT = 5173
const PREVIEW_PORT = 4173

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: LOCAL_HOST,
    port: DEV_PORT,
    strictPort: true,
  },
  preview: {
    host: LOCAL_HOST,
    port: PREVIEW_PORT,
    strictPort: true,
  },
})
