import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build output is minified + mangled to make reverse-engineering harder.
// Note: JavaScript running in the browser can never be 100% protected.
// The real protection comes from keeping the GitHub repo private + the
// subscription check (server-side) that makes stolen code useless.

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  build: {
    outDir: 'dist',
    sourcemap: false,          // never ship source maps in production
    minify: 'terser',          // better minification than esbuild default
    cssMinify: true,
    terserOptions: {
      compress: {
        drop_console: true,    // strip all console.log
        drop_debugger: true,
        passes: 2,
      },
      mangle: {
        toplevel: true,        // mangle top-level names too
      },
      format: {
        comments: false,       // remove all comments from output
      },
    },
    rollupOptions: {
      output: {
        // Fragment the bundle so no single file reveals the whole app
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          qr: ['qrcode-generator'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
