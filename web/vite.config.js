import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5173,
      // Lets the dev server be opened through an ngrok tunnel (HTTPS, needed for camera and GPS on a phone).
      allowedHosts: ['.ngrok-free.app'],
      // CORS is answered by the API (through the proxy below), not by Vite, so there is a single source of truth.
      cors: false,
      // In development, /api calls are proxied to the Express server.
      // To use the API running on another computer, set API_PROXY_TARGET in web/.env.local (see .env.example).
      proxy: {
        '/api': {
          target: env.API_PROXY_TARGET || 'http://localhost:3001',
          changeOrigin: true,
          // ngrok's free plan answers browser-like requests with an HTML warning page unless this header is sent.
          headers: { 'ngrok-skip-browser-warning': 'true' },
        },
      },
    },
  };
});
