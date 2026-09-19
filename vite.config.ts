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
    watch: {
      // Vite's dev server otherwise watches the whole project, including
      // src-tauri/target — Cargo's build output. On Windows those files get
      // locked/rewritten mid-compile, which crashes Vite's watcher with
      // "EBUSY: resource busy or locked" on a build script .exe. Excluding
      // src-tauri entirely (recommended by Tauri's own Vite template) fixes it.
      ignored: ['**/src-tauri/**'],
    },
  },
})
