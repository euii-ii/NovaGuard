import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    open: '/landing.html', // Open landing page by default
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: 'landing.html', // Landing page as main entry
        app: 'react_app.html' // React app
      }
    }
  },
  publicDir: 'public'
})
