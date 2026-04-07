import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: true, // 자동 열기 활성화
  },
  // publicDir: '.', // This turned EVERYTHING into a static asset, preventing module transformation.
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html',
        admin: './admin/index.html',
        login: './mobile-estimate/login.html',
        estimate: './mobile-estimate/index.html',
      }
    }
  }
});

