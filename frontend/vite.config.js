import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for the React frontend.
// The dev server is configured to proxy API calls to the Node backend.

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
});
