import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs-extra';
import path from 'path';

// Plugin to copy manifest.json and icons directory to dist
function copyExtensionAssets() {
  return {
    name: 'copy-extension-assets',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist');
      
      // Ensure icons are copied to dist/icons
      const iconsSrc = fs.existsSync(resolve(__dirname, 'public/icons')) 
        ? resolve(__dirname, 'public/icons')
        : resolve(__dirname, 'icon');
      
      if (fs.existsSync(iconsSrc)) {
        fs.copySync(iconsSrc, resolve(distDir, 'icons'));
      }

      // Copy manifest.json to dist
      const manifestSrc = resolve(__dirname, 'manifest.json');
      if (fs.existsSync(manifestSrc)) {
        fs.copySync(manifestSrc, resolve(distDir, 'manifest.json'));
      }

      // Copy CSS files to dist root for content scripts if referenced separately
      const stylesSrc = resolve(__dirname, 'src/styles');
      if (fs.existsSync(stylesSrc)) {
        const files = fs.readdirSync(stylesSrc);
        for (const file of files) {
          if (file.endsWith('.css')) {
            fs.copySync(resolve(stylesSrc, file), resolve(distDir, file));
          }
        }
      }
    }
  };
}

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'sidepanel.html'),
        background: resolve(__dirname, 'src/background/background.ts'),
        'content-bubble': resolve(__dirname, 'src/content/bubble.ts'),
        'content-email': resolve(__dirname, 'src/content/email.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (['background', 'content-bubble', 'content-email'].includes(chunkInfo.name)) {
            return '[name].js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return '[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  plugins: [copyExtensionAssets()]
});
