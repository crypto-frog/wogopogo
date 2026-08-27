import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Local dev: the Vite server proxies /api to the PHP dev server, so the
// browser talks to one origin and no CORS setup is needed.
// Production: the built site and the /api folder live on the same domain,
// so the relative /api base keeps working unchanged.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
