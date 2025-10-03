import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 3000
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          'three-core': ['three'],
          'three-loaders': [
            'three/examples/jsm/loaders/GLTFLoader.js'
          ],
          'three-controls': [
            'three/examples/jsm/controls/OrbitControls.js'
          ],
          'three-postprocessing': [
            'three/examples/jsm/postprocessing/EffectComposer.js',
            'three/examples/jsm/postprocessing/RenderPass.js',
            'three/examples/jsm/postprocessing/UnrealBloomPass.js',
            'three/examples/jsm/postprocessing/ShaderPass.js'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  publicDir: 'public',
  base: '/'
});