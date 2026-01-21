import path from 'path';
import vue from '@vitejs/plugin-vue';
import { defineConfig, loadEnv } from 'vite';

// Vite 6.x configuration
export default defineConfig(({ command, mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [
      vue(),
      // ESLint plugin removed due to incompatibility with ESLint 9.x
      // Run ESLint separately using: pnpm lint
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api_user': {
          target: env.VITE_API_USER_URL_PROXY_TARGET,
          changeOrigin: true,
          followRedirects: true,
          rewrite: (path) => path.replace(/^\/api_user/, '/api'),
        },
        '/api_agent': {
          target: env.VITE_API_AGENT_URL_PROXY_TARGET,
          changeOrigin: true,
          followRedirects: true,
          rewrite: (path) => path.replace(/^\/api_agent/, '/api'),
        },
      },
    },
    build: {
      // Vite 6.x optimizations
      target: 'esnext',
      minify: 'esbuild',
      cssMinify: true,
    },
  };
});
