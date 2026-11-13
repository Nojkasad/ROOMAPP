import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // In development the browser only talks to Vite (localhost:5173).
    // Requests to /api are forwarded to Express, so it is one origin:
    // no CORS setup, and auth cookies (stage 3) work without extra config.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
