import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
  }
  
  init() {
    // Створення сцени
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);
    
    // Створення камери
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
    this.camera.position.set(-5, -1, -8);
    
    // Створення рендерера
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: this.canvas,
      antialias: true 
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    // Створення контролів
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 10;
    
    // Освітлення
    this.setupLighting();
    
    console.log('SceneManager ініціалізовано');
  }
  
  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);
    
    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
    
    // Point light для додаткового освітлення
    const pointLight = new THREE.PointLight(0x4f9eff, 0.5, 10);
    pointLight.position.set(-5, 3, -5);
    this.scene.add(pointLight);
  }
  
  update() {
    if (this.controls) {
      this.controls.update();
    }
  }
  
  onWindowResize() {
    if (!this.camera || !this.renderer) return;
    
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }
  
  setExposure(exposure) {
    if (this.renderer) {
      this.renderer.toneMappingExposure = exposure;
    }
  }
  
  addCustomLighting(model) {
    // Видаляємо попереднє власне освітлення
    this.removeCustomLighting();
    
    // Обчислюємо розміри моделі
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    // 1. Головне освітлення (замість сонця) - за замовчуванням вимкнено
    const mainLight = new THREE.DirectionalLight(0xffffff, 0);
    mainLight.position.set(
      center.x + size.x * 0.5, 
      center.y + size.y * 1.5, 
      center.z + size.z * 0.5
    );
    mainLight.target.position.copy(center);
    mainLight.castShadow = true;
    this.scene.add(mainLight);
    this.scene.add(mainLight.target);
    
    // 2. Внутрішнє свічення моделі - за замовчуванням вимкнено
    const innerLight = new THREE.PointLight(0xffffaa, 0, size.length());
    innerLight.position.copy(center);
    this.scene.add(innerLight);
    
    // 3. Підсвічування знизу - за замовчуванням вимкнено
    const bottomLight = new THREE.PointLight(0xff8800, 0, size.length() * 0.8);
    bottomLight.position.set(center.x, center.y - size.y * 0.1, center.z);
    this.scene.add(bottomLight);
    
    // 4. Акцентне освітлення
    const accentLight = new THREE.SpotLight(0xff0080, 1.0, size.length() * 1.5, Math.PI * 0.3);
    accentLight.position.set(
      center.x - size.x * 0.8, 
      center.y + size.y * 0.8, 
      center.z + size.z * 0.8
    );
    accentLight.target.position.copy(center);
    this.scene.add(accentLight);
    this.scene.add(accentLight.target);
    
    console.log('✨ Додано власне освітлення моделі');
    
    // Зберігаємо посилання для подальшого управління
    this.customLights = {
      main: mainLight,
      inner: innerLight, 
      bottom: bottomLight,
      accent: accentLight
    };
  }
  
  removeCustomLighting() {
    if (this.customLights) {
      Object.values(this.customLights).forEach(light => {
        if (light.target) {
          this.scene.remove(light.target);
        }
        this.scene.remove(light);
      });
      this.customLights = null;
    }
  }
  
  updateCustomLighting(params) {
    if (params.toggleLighting) {
      if (params.useCustom) {
        // Вмикаємо власне освітлення
        if (this.customLights) {
          Object.values(this.customLights).forEach(light => {
            light.visible = true;
            if (light.target) light.target.visible = true;
          });
        }
        console.log('🔄 Увімкнено власне освітлення');
      } else {
        // Вимикаємо власне освітлення (залишається тільки базове з setupLighting)
        if (this.customLights) {
          Object.values(this.customLights).forEach(light => {
            light.visible = false;
            if (light.target) light.target.visible = false;
          });
        }
        console.log('🔄 Увімкнено оригінальне освітлення');
      }
      return;
    }
    
    if (this.customLights) {
      if (params.mainIntensity !== undefined) {
        this.customLights.main.intensity = params.mainIntensity;
      }
      if (params.innerIntensity !== undefined) {
        this.customLights.inner.intensity = params.innerIntensity;
      }
      if (params.bottomIntensity !== undefined) {
        this.customLights.bottom.intensity = params.bottomIntensity;
      }
      if (params.innerColor !== undefined) {
        this.customLights.inner.color.set(params.innerColor);
      }
    }
  }
  
  getRenderer() {
    return this.renderer;
  }
  
  getScene() {
    return this.scene;
  }
  
  getCamera() {
    return this.camera;
  }
}