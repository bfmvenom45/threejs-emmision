import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export class BloomManager {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.simpleComposer = null;
    this.selectiveComposer = null;
    this.finalComposer = null;
    this.bloomLayer = new THREE.Layers();
    this.bloomLayer.set(1);
    this.darkMaterial = new THREE.MeshBasicMaterial({ color: "black" });
    this.materials = {};
    
    this.mode = 'simple';
    
    this.params = {
      exposure: 1.0,
      bloomStrength: 1.5,
      bloomThreshold: 0.1,
      bloomRadius: 0.4
    };
  }
  
  init() {
    this.initSimpleBloom();
    this.initSelectiveBloom();
    console.log('BloomManager ініціалізовано');
  }
  
  initSimpleBloom() {
    const renderer = this.sceneManager.getRenderer();
    const scene = this.sceneManager.getScene();
    const camera = this.sceneManager.getCamera();
    
    const renderPass = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.params.bloomStrength,
      this.params.bloomRadius,
      this.params.bloomThreshold
    );
    
    this.simpleComposer = new EffectComposer(renderer);
    this.simpleComposer.addPass(renderPass);
    this.simpleComposer.addPass(bloomPass);
  }
  
  initSelectiveBloom() {
    const renderer = this.sceneManager.getRenderer();
    const scene = this.sceneManager.getScene();
    const camera = this.sceneManager.getCamera();
    
    // Bloom композитор
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.params.bloomStrength,
      this.params.bloomRadius,
      this.params.bloomThreshold
    );
    
    this.selectiveComposer = new EffectComposer(renderer);
    this.selectiveComposer.renderToScreen = false;
    this.selectiveComposer.addPass(new RenderPass(scene, camera));
    this.selectiveComposer.addPass(bloomPass);
    
    // Фінальний композитор
    const finalPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: this.selectiveComposer.renderTarget2.texture }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D baseTexture;
          uniform sampler2D bloomTexture;
          varying vec2 vUv;
          
          void main() {
            gl_FragColor = (texture2D(baseTexture, vUv) + vec4(1.0) * texture2D(bloomTexture, vUv));
          }
        `,
        defines: {}
      }),
      "baseTexture"
    );
    finalPass.needsSwap = true;
    
    this.finalComposer = new EffectComposer(renderer);
    this.finalComposer.addPass(new RenderPass(scene, camera));
    this.finalComposer.addPass(finalPass);
  }
  
  setupModelLayers(model) {
    // Налаштування шарів для селективного bloom
    model.traverse((child) => {
      if (child.isMesh && child.material.emissive) {
        child.layers.enable(1); // Bloom шар
      }
    });
  }
  
  updateParams(params) {
    Object.assign(this.params, params);
    
    // Оновлення exposure
    if (params.exposure !== undefined) {
      this.sceneManager.setExposure(params.exposure);
    }
    
    // Оновлення bloom параметрів
    if (this.simpleComposer && this.simpleComposer.passes[1]) {
      const bloomPass = this.simpleComposer.passes[1];
      bloomPass.strength = this.params.bloomStrength;
      bloomPass.threshold = this.params.bloomThreshold;
      bloomPass.radius = this.params.bloomRadius;
    }
    
    if (this.selectiveComposer && this.selectiveComposer.passes[1]) {
      const bloomPass = this.selectiveComposer.passes[1];
      bloomPass.strength = this.params.bloomStrength;
      bloomPass.threshold = this.params.bloomThreshold;
      bloomPass.radius = this.params.bloomRadius;
    }
  }
  
  setMode(mode) {
    this.mode = mode;
    console.log('Bloom режим змінено на:', mode);
  }
  
  render() {
    const scene = this.sceneManager.getScene();
    const camera = this.sceneManager.getCamera();
    
    if (this.mode === 'simple') {
      this.simpleComposer.render();
    } else {
      // Селективний bloom
      this.renderBloomSelective(scene, camera);
    }
  }
  
  renderBloomSelective(scene, camera) {
    // Зберегти оригінальні матеріали
    scene.traverse((obj) => {
      if (obj.isMesh && obj.layers.test(this.bloomLayer) === false) {
        this.materials[obj.uuid] = obj.material;
        obj.material = this.darkMaterial;
      }
    });
    
    // Рендер bloom
    this.selectiveComposer.render();
    
    // Відновити матеріали
    scene.traverse((obj) => {
      if (this.materials[obj.uuid]) {
        obj.material = this.materials[obj.uuid];
        delete this.materials[obj.uuid];
      }
    });
    
    // Фінальний рендер
    this.finalComposer.render();
  }
  
  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    if (this.simpleComposer) {
      this.simpleComposer.setSize(width, height);
    }
    
    if (this.selectiveComposer) {
      this.selectiveComposer.setSize(width, height);
    }
    
    if (this.finalComposer) {
      this.finalComposer.setSize(width, height);
    }
  }
}