import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Huawei Browser is often an older Chromium. Keep syntax conservative.
    target: "chrome80",
  },
})
