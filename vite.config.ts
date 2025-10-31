// vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Configuración base para GitHub Pages
  base: '/CHAT-TV/', 
});
