import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    
    react(), 
    
    tailwindcss()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://178.128.109.10:8080',
        changeOrigin: true,
        secure: false
      } 
    }
  }
})
