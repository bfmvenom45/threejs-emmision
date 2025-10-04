import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export class ModelLoader {
  constructor() {
    this.loader = new GLTFLoader();
    this.loadedModels = new Map(); // Кеш для завантажених моделей
    this.loadTimeout = 30000; // 30 секунд timeout
    this.dracoEnabled = true; // Флаг для контролю DRACO
    
    // Налаштування DRACOLoader для стиснених моделей
    this.setupDracoLoader();
  }
  
  disableDraco() {
    console.log('🔧 Вимикаємо DRACO підтримку через помилки CDN');
    this.dracoEnabled = false;
    this.loader = new GLTFLoader(); // Перестворюємо loader без DRACO
  }
  
  setupDracoLoader() {
    try {
      const dracoLoader = new DRACOLoader();
      
      // Спробуємо декілька CDN для DRACO decoder
      const decoderPaths = [
        'https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/',
        'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/',
        'https://threejs.org/examples/jsm/libs/draco/'
      ];
      
      // Використовуємо перший доступний CDN
      dracoLoader.setDecoderPath(decoderPaths[0]);
      dracoLoader.setDecoderConfig({ type: 'js' });
      
      // Встановлюємо DRACO loader
      this.loader.setDRACOLoader(dracoLoader);
      
      console.log(`✅ DRACOLoader налаштовано: ${decoderPaths[0]}`);
      console.log('📦 Підтримка стиснених GLB файлів увімкнена');
      
      // Додаємо cleanup при завершенні роботи
      window.addEventListener('beforeunload', () => {
        try {
          dracoLoader.dispose();
        } catch (e) {
          // Ignore cleanup errors
        }
      });
      
    } catch (error) {
      console.error('❌ Помилка налаштування DRACOLoader:', error);
      console.warn('⚠️ Деякі стиснені моделі можуть не завантажуватися');
      
      // Fallback: вимикаємо DRACO
      this.disableDraco();
    }
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
          
          // Детальна діагностика помилок
          if (error.message && (error.message.includes('DRACO') || error.message.includes('Failed to fetch'))) {
            console.error(`❌ DRACO/CDN помилка для ${modelPath}:`, error.message);
            console.log('� Спроба завантажити без DRACO підтримки...');
            
            // Спробуємо завантажити без DRACO
            this.loadWithoutDraco(modelPath).then(resolve).catch(() => {
              // Якщо і це не спрацювало, спробуємо fallback
              if (modelPath !== 'House.glb') {
                console.log('🔄 Спроба завантажити fallback модель House.glb');
                this.load('House.glb').then(resolve).catch(reject);
              } else {
                reject(error);
              }
            });
            return;
          } else {
            console.error(`❌ Помилка завантаження ${modelPath}:`, error);
          }
          
          // Спробуємо завантажити fallback модель
          if (modelPath !== 'House.glb') {
            console.log('🔄 Спроба завантажити fallback модель House.glb');
            this.load('House.glb').then(resolve).catch(reject);
          } else {
            reject(error);
          }
        }
      );
    });
  }
  
  async loadWithoutDraco(modelPath) {
    return new Promise((resolve, reject) => {
      console.log(`🔧 Завантаження ${modelPath} без DRACO підтримки...`);
      
      // Створюємо новий loader без DRACO
      const simpleLoader = new GLTFLoader();
      
      simpleLoader.load(
        modelPath,
        (gltf) => {
          const model = gltf.scene;
          
          if (!model || !model.children || model.children.length === 0) {
            console.warn(`Модель ${modelPath} порожня або не містить геометрії`);
          }
          
          // Оптимізація моделі
          this.optimizeModel(model);
          
          // Збереження в кеш
          this.loadedModels.set(modelPath + '_no_draco', model.clone());
          
          console.log(`✅ Модель ${modelPath} завантажена без DRACO (${model.children.length} об'єктів)`);
          resolve(model);
        },
        (progress) => {
          if (progress.total > 0) {
            const percent = (progress.loaded / progress.total * 100).toFixed(0);
            console.log(`📦 Завантаження без DRACO ${modelPath}: ${percent}%`);
          }
        },
        (error) => {
          console.error(`❌ Не вдалося завантажити ${modelPath} навіть без DRACO:`, error);
          reject(error);
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
    
    // Видаляємо існуюче світло з моделі
    this.removeExistingLights(model);
    
    // Центрування моделі
    this.centerModel(model);
  }
  
  removeExistingLights(model) {
    const lightsToRemove = [];
    
    model.traverse((child) => {
      // Видаляємо всі типи світел з моделі
      if (child.isLight || 
          child.isDirectionalLight || 
          child.isPointLight || 
          child.isSpotLight ||
          child.isAmbientLight ||
          child.isHemisphereLight) {
        
        console.log(`🗑️ Видаляємо світло: ${child.name || child.type}`);
        lightsToRemove.push(child);
      }
      
      // Також видаляємо об'єкти з назвами світел
      if (child.name && (
          child.name.toLowerCase().includes('light') ||
          child.name.toLowerCase().includes('lamp') ||
          child.name.toLowerCase().includes('bulb')
      )) {
        console.log(`🗑️ Видаляємо світловий об'єкт: ${child.name}`);
        lightsToRemove.push(child);
      }
    });
    
    // Видаляємо знайдені світла
    lightsToRemove.forEach(light => {
      if (light.parent) {
        light.parent.remove(light);
      }
    });
    
    console.log(`✅ Видалено ${lightsToRemove.length} світлових об'єктів`);
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
    
    // піднімаємо на 10% висоти моделі
    model.position.y += size.y * 0.2;
    
    // Масштабування для стандартного розміру
    const maxDimension = Math.max(size.x, size.y, size.z);
    const targetSize = 5; // Цільовий розмір
    
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
  
  // 📁 Завантаження файлів з локальної файлової системи
  async loadFromFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('Не вибрано файл'));
        return;
      }
      
      // Перевірка типу файлу
      const validTypes = ['.glb', '.gltf'];
      const fileName = file.name.toLowerCase();
      const isValidType = validTypes.some(type => fileName.endsWith(type));
      
      if (!isValidType) {
        reject(new Error('Підтримуються тільки .glb та .gltf файли'));
        return;
      }
      
      console.log(`📁 Завантаження файлу: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      
      // Створення URL для файлу
      const fileURL = URL.createObjectURL(file);
      
      // Timeout для завантаження
      const timeoutId = setTimeout(() => {
        URL.revokeObjectURL(fileURL);
        reject(new Error(`Timeout завантаження ${file.name}`));
      }, this.loadTimeout);
      
      this.loader.load(
        fileURL,
        (gltf) => {
          const model = gltf.scene;
          
          if (!model || !model.children || model.children.length === 0) {
            console.warn(`Модель ${file.name} порожня або не містить геометрії`);
          }
          
          // Оптимізація моделі
          this.optimizeModel(model);
          
          // Очищення URL
          URL.revokeObjectURL(fileURL);
          clearTimeout(timeoutId);
          
          // Додавання в кеш з назвою файлу
          const cacheKey = `file_${file.name}_${Date.now()}`;
          this.loadedModels.set(cacheKey, model.clone());
          
          console.log(`✅ Файл ${file.name} успішно завантажено (${model.children.length} об'єктів)`);
          resolve(model);
        },
        (progress) => {
          if (progress.total > 0) {
            const percent = (progress.loaded / progress.total * 100).toFixed(0);
            console.log(`📁 Завантаження ${file.name}: ${percent}%`);
          }
        },
        (error) => {
          URL.revokeObjectURL(fileURL);
          clearTimeout(timeoutId);
          
          console.error(`❌ Помилка завантаження ${file.name}:`, error);
          reject(error);
        }
      );
    });
  }
}