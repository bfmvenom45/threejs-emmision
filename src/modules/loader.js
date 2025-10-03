import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class ModelLoader {
  constructor() {
    this.loader = new GLTFLoader();
    this.loadedModels = new Map(); // Кеш для завантажених моделей
    this.loadTimeout = 30000; // 30 секунд timeout
  }
  
  async load(modelPath) {
    return new Promise((resolve, reject) => {
      // Перевіряємо кеш
      if (this.loadedModels.has(modelPath)) {
        console.log(`Модель ${modelPath} завантажена з кешу`);
        const cachedModel = this.loadedModels.get(modelPath);
        resolve(cachedModel.clone());
        return;
      }
      
      console.log(`Завантаження моделі: ${modelPath}`);
      
      // Timeout для завантаження
      const timeoutId = setTimeout(() => {
        console.error(`Timeout завантаження моделі ${modelPath}`);
        reject(new Error(`Timeout завантаження ${modelPath}`));
      }, this.loadTimeout);
      
      this.loader.load(
        modelPath,
        (gltf) => {
          const model = gltf.scene;
          
          if (!model || !model.children || model.children.length === 0) {
            console.warn(`Модель ${modelPath} порожня або не містить геометрії`);
          }
          
          // Оптимізація моделі
          this.optimizeModel(model);
          
          // Збереження в кеш
          this.loadedModels.set(modelPath, model.clone());
          
          console.log(`Модель ${modelPath} успішно завантажена (${model.children.length} об'єктів)`);
          clearTimeout(timeoutId);
          resolve(model);
        },
        (progress) => {
          if (progress.total > 0) {
            const percent = (progress.loaded / progress.total * 100).toFixed(0);
            console.log(`Завантаження ${modelPath}: ${percent}% (${progress.loaded}/${progress.total} bytes)`);
          }
        },
        (error) => {
          clearTimeout(timeoutId);
          console.error(`Помилка завантаження ${modelPath}:`, error);
          // Спробуємо завантажити fallback модель
          if (modelPath !== 'House.glb') {
            console.log('Спроба завантажити fallback модель House.glb');
            this.load('House.glb').then(resolve).catch(reject);
          } else {
            reject(error);
          }
        }
      );
    });
  }
  
  optimizeModel(model) {
    model.traverse((child) => {
      if (child.isMesh) {
        // Увімкнення frustum culling
        child.frustumCulled = true;
        
        // Оптимізація матеріалів
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => this.optimizeMaterial(mat));
          } else {
            this.optimizeMaterial(child.material);
          }
        }
        
        // Обчислення bounding box
        if (child.geometry) {
          child.geometry.computeBoundingBox();
          child.geometry.computeBoundingSphere();
        }
      }
    });
    
    // Центрування моделі
    this.centerModel(model);
  }
  
  optimizeMaterial(material) {
    // Налаштування для кращої продуктивності
    material.side = material.side || THREE.FrontSide;
    
    // Додавання емісивних властивостей для bloom ефекту
    if (!material.emissive) {
      material.emissive = new THREE.Color(0x000000);
      material.emissiveIntensity = 0;
    }
  }
  
  centerModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    // Центрування моделі
    model.position.x = -center.x;
    model.position.y = -center.y;
    model.position.z = -center.z;
    
    // Масштабування для стандартного розміру
    const maxDimension = Math.max(size.x, size.y, size.z);
    const targetSize = 2; // Цільовий розмір
    
    if (maxDimension > 0) {
      const scale = targetSize / maxDimension;
      model.scale.setScalar(scale);
    }
    
    console.log(`Модель центрована та масштабована. Розмір: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
  }
  
  preloadModels(modelPaths) {
    // Попереднє завантаження моделей
    const loadPromises = modelPaths.map(path => 
      this.load(path).catch(error => {
        console.warn(`Не вдалося попередньо завантажити ${path}:`, error);
        return null;
      })
    );
    
    return Promise.allSettled(loadPromises);
  }
  
  clearCache() {
    this.loadedModels.forEach((model, path) => {
      // Очищення ресурсів
      model.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    });
    
    this.loadedModels.clear();
    console.log('Кеш моделей очищено');
  }
  
  getLoadedModels() {
    return Array.from(this.loadedModels.keys());
  }
}