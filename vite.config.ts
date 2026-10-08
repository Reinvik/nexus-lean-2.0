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
    {
      name: 'api-dev-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api/send-a3-email')) {
            try {
              // @ts-ignore
              const handlerModule = await import('./api/send-a3-email.js');
              let body = '';
              req.on('data', (chunk) => {
                body += chunk;
              });
              req.on('end', async () => {
                // @ts-ignore
                req.body = body ? JSON.parse(body) : {};
                const customRes = {
                  setHeader(k: string, v: string) {
                    res.setHeader(k, v);
                  },
                  status(code: number) {
                    res.statusCode = code;
                    return {
                      json(data: any) {
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(data));
                      },
                      end() {
                        res.end();
                      },
                    };
                  },
                };
                await handlerModule.default(req, customRes);
              });
              return;
            } catch (err: any) {
              console.error('Error in dev API middleware:', err);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
              return;
            }
          }
          next();
        });
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallbackDenylist: [/^\/api\//, /^\/assets\//],
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
