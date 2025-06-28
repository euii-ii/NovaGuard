import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    open: '/landing.html', // Open landing page by default
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
