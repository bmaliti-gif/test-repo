import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// The PWA plugin (vite-plugin-pwa) is added in Block 12.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
});
