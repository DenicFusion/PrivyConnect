import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.VITE_R2_ACCOUNT_ID': JSON.stringify(env.VITE_R2_ACCOUNT_ID || env.R2_ACCOUNT_ID),
      'process.env.VITE_R2_ACCESS_KEY_ID': JSON.stringify(env.VITE_R2_ACCESS_KEY_ID || env.R2_ACCESS_KEY_ID),
      'process.env.VITE_R2_SECRET_ACCESS_KEY': JSON.stringify(env.VITE_R2_SECRET_ACCESS_KEY || env.R2_SECRET_ACCESS_KEY),
      'process.env.VITE_R2_BUCKET_NAME': JSON.stringify(env.VITE_R2_BUCKET_NAME || env.R2_BUCKET_NAME),
      'process.env.VITE_R2_PUBLIC_URL': JSON.stringify(env.VITE_R2_PUBLIC_URL || env.R2_PUBLIC_URL),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
