import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs-extra';

// Plugin to copy assets and copy built outputs back to root for dual compatibility
function copyExtensionAssets() {
  return {
    name: 'copy-extension-assets',
    closeBundle() {
      const rootDir = __dirname;
      const distDir = resolve(rootDir, 'dist');
      
      // 1. Copy icons to dist/icons
      const iconsSrc = fs.existsSync(resolve(rootDir, 'public/icons')) 
        ? resolve(rootDir, 'public/icons')
        : resolve(rootDir, 'icons');
      
      if (fs.existsSync(iconsSrc)) {
        fs.copySync(iconsSrc, resolve(distDir, 'icons'));
      }

      // 2. Copy manifest.json to dist
      const manifestSrc = resolve(rootDir, 'manifest.json');
      if (fs.existsSync(manifestSrc)) {
        fs.copySync(manifestSrc, resolve(distDir, 'manifest.json'));
      }

      // 3. Copy CSS files to dist root
      const stylesSrc = resolve(rootDir, 'src/styles');
      if (fs.existsSync(stylesSrc)) {
        const files = fs.readdirSync(stylesSrc);
        for (const file of files) {
          if (file.endsWith('.css')) {
            fs.copySync(resolve(stylesSrc, file), resolve(distDir, file));
            // Also copy to root for root directory extension loading
            fs.copySync(resolve(stylesSrc, file), resolve(rootDir, file));
          }
        }
      }

      // 4. Copy generated root entry JS files back to root directory so loading root directory works out of the box
      const entryFiles = ['background.js', 'content-bubble.js', 'content-email.js'];
      for (const file of entryFiles) {
        const distFile = resolve(distDir, file);
        if (fs.existsSync(distFile)) {
          fs.copySync(distFile, resolve(rootDir, file));
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
