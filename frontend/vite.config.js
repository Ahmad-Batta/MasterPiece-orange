import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const modulePath = id.replaceAll(String.fromCharCode(92), '/');
          if (modulePath.includes('/node_modules/gsap/')) return 'animation-gsap';
          if (modulePath.includes('/node_modules/motion')) return 'animation-motion';
        },
      },
    },
  },
});
