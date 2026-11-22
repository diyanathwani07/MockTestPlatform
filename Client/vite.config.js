import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {}
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      stream: 'stream-browserify',
    }
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router-dom/')) {
              return 'vendor-react';
            }
          }
        }
      },
      onwarn(warning, warn) {
        if (warning.code === 'EVAL' && warning.id && warning.id.includes('lottie-web')) {
          return;
        }
        warn(warning);
      }
    }
  }
})
