import { defineConfig } from 'vite';

export default defineConfig({
  root: 'client',
  server: {
    port: 41018,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:42018',
        changeOrigin: true
      }
    }
  }
});
