import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Root directory containing the index.html
  root: path.resolve(__dirname, 'src'),
  // Public assets directory
  publicDir: path.resolve(__dirname, 'public'),
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/index.html'),
      },
      output: {
        // Use chunk names without hash for Cloudflare compatibility
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    },
    sourcemap: true,
    minify: true,
    // For Cloudflare compatibility - ensure clean paths
    assetsDir: 'assets',
    emptyOutDir: true, 
    // Define environment variables
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env.REACT_VERSION': JSON.stringify('18')
    }
  },
  // Development server config
  server: {
    port: 3000,
    open: true
  },
  // Resolve paths
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@styles': path.resolve(__dirname, 'styles')
    }
  }
}); 