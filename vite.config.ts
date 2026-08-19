import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Huawei Browser is often an older Chromium. Keep syntax conservative.
    target: "chrome80",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/react-router")) {
            return "vendor-router";
          }
          if (id.includes("node_modules/axios")) {
            return "vendor-axios";
          }
          if (id.includes("node_modules/qrcode")) {
            return "vendor-qrcode";
          }
        },
      },
    },
  },
})
