import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Fixed to match src-tauri/tauri.conf.json's `build.devUrl` — `tauri dev` starts this
  // dev server itself (`beforeDevCommand`) and then loads that exact URL; without a
  // matching, stable port here, Tauri's window loads nothing (blank/failed launch),
  // which is the actual cause of "the desktop app never opens" reported by the user.
  server: {
    port: 1420,
    strictPort: true,
  },
})
