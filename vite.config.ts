import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_STRIPE_PAYMENT_LINK': JSON.stringify(env.VITE_STRIPE_PAYMENT_LINK),
      'import.meta.env.VITE_PURCHASE_VALUE': JSON.stringify(env.VITE_PURCHASE_VALUE),
      'import.meta.env.VITE_PURCHASE_CURRENCY': JSON.stringify(env.VITE_PURCHASE_CURRENCY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
