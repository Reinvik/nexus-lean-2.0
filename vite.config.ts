import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3204,
    host: '0.0.0.0',
    open: false,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      includeAssets: ['nexus-logo.svg', 'be-lean-logo.png', 'nexus-icon-32.svg', 'nexus-icon-64.svg'],
      manifest: {
        name: 'Nexus Lean 2.0',
        short_name: 'Nexus Lean',
        description: 'Plataforma de excelencia operacional y mejora continua Nexus Lean 2.0',
        theme_color: '#050B14',
        background_color: '#050B14',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: 'nexus-logo.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          supabase: ['@supabase/supabase-js'],
          icons: ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
});
