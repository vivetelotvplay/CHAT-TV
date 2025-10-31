// vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 1. CONFIGURA LA RUTA BASE:
  base: '/CHAT-TV/', 
});
