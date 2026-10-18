import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Keep the earlier React routes available while the imported showcase owns /.
const legacyRoutes = (): Plugin => {
  const middleware = (req: { url?: string }, _res: unknown, next: () => void) => {
    if (/^\/(demo|day|style-guide|classic)\/?(?:\?|$)/.test(req.url || '')) {
      const query = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      req.url = `/legacy.html${query}`;
    }
    next();
  };
  return {
    name: 'look-legacy-routes',
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  };
};

export default defineConfig({
  plugins: [react(), legacyRoutes()],
  build: { rolldownOptions: { input: { showcase: 'index.html', legacy: 'legacy.html' } } },
});
