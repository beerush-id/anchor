import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import * as path from 'node:path';

// https://vite.dev/config/
export default defineConfig(() => ({
  resolve: {
    alias: {
      'react-dom/client': 'react-dom/profiling',
      '@lib': path.resolve(__dirname, 'src/lib'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@components': path.resolve(__dirname, 'src/components'),
    },
  },
  plugins: [tailwindcss(), react()],
}));
