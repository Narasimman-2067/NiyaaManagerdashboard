// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // // https://vite.dev/config/
// // export default defineConfig({
// //   plugins: [react()],
// // })
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split react and react-dom into their own chunk
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Split UI libraries (e.g., react-bootstrap, react-select)
          'ui-vendor': ['react-bootstrap', 'react-select'],
          // Split firebase if used
          'firebase-vendor': ['firebase/app', 'firebase/firestore'],
        },
      },
    },
  },
});
