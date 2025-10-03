import * as THREE from 'three';

export class GlowManager {
  constructor() {
    this.glowMeshes = [];
    this.originalMaterials = new Map(); // Зберігаємо оригінальні матеріали
    this.pulseEnabled = false;
    this.pulseSpeed = 2.0;
    this.pulseIntensity = 1.0;
    this.glowMode = 'separate'; // 'separate' або 'emissive'
    
    this.params = {
      intensity: 2.0,
      hue: 0.6
    };
  }
  
  addInnerGlow(model) {
    this.clearGlowMeshes();
    
    if (!model) return;
    
    if (this.glowMode === 'emissive') {
      this.addEmissiveGlow(model);
    } else {
      this.addSeparateGlow(model);
    }
  }
  
  addEmissiveGlow(model) {
    // Модифікація оригінальних матеріалів для додання emissive glow тільки на прозорих елементах
    model.traverse((child) => {
      if (child.isMesh && child.material) {
        // Зберігаємо оригінальний матеріал
        if (!this.originalMaterials.has(child.uuid)) {
          this.originalMaterials.set(child.uuid, child.material.clone());
        }
        
        // Перевіряємо чи матеріал прозорий або має альфа-канал
        const isTransparent = child.material.transparent || 
                            child.material.opacity < 1.0 || 
                            (child.material.map && child.material.map.format === THREE.RGBAFormat) ||
                            child.material.alphaTest > 0;
        
        if (isTransparent) {
          // Робимо матеріал прозорим якщо ще не є
          child.material.transparent = true;
          if (child.material.opacity === 1.0) {
            child.material.opacity = 0.7; // Робимо напівпрозорим
          }
          
          // Додаємо emissive свічення тільки до прозорих матеріалів
          if (child.material.emissive) {
            const glowColor = new THREE.Color().setHSL(this.params.hue, 1, 0.4);
            child.material.emissive.copy(glowColor);
            child.material.emissiveIntensity = this.params.intensity * 0.2;
          }
          
          // Додаємо до bloom шару
          child.layers.enable(1);
          this.glowMeshes.push(child);
          
          console.log(`Прозорий матеріал знайдено:`, child.material.name || 'unnamed', 
                     `opacity: ${child.material.opacity}, transparent: ${child.material.transparent}`);
        } else {
          // Для непрозорих матеріалів видаляємо emission
          if (child.material.emissive) {
            child.material.emissive.setRGB(0, 0, 0);
            child.material.emissiveIntensity = 0;
          }
        }
      }
    });
    
    console.log(`Додано emissive свічення до ${this.glowMeshes.length} прозорих матеріалів`);
  }
  
  addSeparateGlow(model) {
    const meshesToProcess = [];
    
    // Збір всіх мешів
    model.traverse((child) => {
      if (child.isMesh) {
        meshesToProcess.push(child);
      }
    });
    
    // Створення окремих glow мешів
    meshesToProcess.forEach(mesh => {
      try {
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(this.params.hue, 1, 0.5),
          transparent: true,
          opacity: 0.6,
          side: THREE.BackSide
        });
        
        const glowMesh = new THREE.Mesh(mesh.geometry, glowMaterial);
        glowMesh.scale.multiplyScalar(1.02);
        glowMesh.layers.enable(1); // Bloom шар
        
        model.add(glowMesh);
        this.glowMeshes.push(glowMesh);
        
      } catch (error) {
        console.warn('Не вдалося створити glow для меша:', error);
      }
    });
    
    console.log(`Додано окреме свічення до ${this.glowMeshes.length} мешів`);
  }
  
  clearGlowMeshes() {
    if (this.glowMode === 'emissive') {
      // Відновлюємо оригінальні матеріали
      this.glowMeshes.forEach(mesh => {
        const originalMaterial = this.originalMaterials.get(mesh.uuid);
        if (originalMaterial && mesh.material) {
          mesh.material = originalMaterial;
        }
        mesh.layers.disable(1);
      });
      this.originalMaterials.clear();
    } else {
      // Видаляємо окремі glow меши
      this.glowMeshes.forEach(mesh => {
        if (mesh.parent) {
          mesh.parent.remove(mesh);
        }
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          mesh.material.dispose();
        }
      });
    }
    this.glowMeshes = [];
  }
  
  updateParams(params) {
    Object.assign(this.params, params);
    
    if (this.glowMode === 'emissive') {
      // Оновлення emissive кольору
      this.glowMeshes.forEach(mesh => {
        if (mesh.material && mesh.material.emissive) {
          const glowColor = new THREE.Color().setHSL(this.params.hue, 1, 0.3);
          mesh.material.emissive.copy(glowColor);
          mesh.material.emissiveIntensity = this.params.intensity * 0.1;
        }
      });
    } else {
      // Оновлення кольору окремих glow мешів
      this.glowMeshes.forEach(mesh => {
        if (mesh.material) {
          mesh.material.color.setHSL(this.params.hue, 1, 0.5);
        }
      });
    }
  }
  
  setGlowMode(mode) {
    this.glowMode = mode;
    console.log('Glow режим змінено на:', mode);
  }
  
  getGlowMode() {
    return this.glowMode;
  }
  
  analyzeModelTransparency(model) {
    // Аналізуємо модель для виявлення прозорих матеріалів
    const transparentMaterials = [];
    const opaqueMaterials = [];
    
    model.traverse((child) => {
      if (child.isMesh && child.material) {
        const material = child.material;
        const isTransparent = material.transparent || 
                            material.opacity < 1.0 || 
                            (material.map && material.map.format === THREE.RGBAFormat) ||
                            material.alphaTest > 0;
        
        if (isTransparent) {
          transparentMaterials.push({
            name: material.name || 'unnamed',
            opacity: material.opacity,
            transparent: material.transparent,
            mesh: child
          });
        } else {
          opaqueMaterials.push({
            name: material.name || 'unnamed',
            mesh: child
          });
        }
      }
    });
    
    console.log(`Аналіз моделі завершено:
      - Прозорих матеріалів: ${transparentMaterials.length}
      - Непрозорих матеріалів: ${opaqueMaterials.length}`);
    
    return {
      transparent: transparentMaterials,
      opaque: opaqueMaterials
    };
  }
  
  forceTransparency(model, opacity = 0.6) {
    // Примусово робимо всі матеріали напівпрозорими для кращого ефекту
    model.traverse((child) => {
      if (child.isMesh && child.material) {
        if (!this.originalMaterials.has(child.uuid)) {
          this.originalMaterials.set(child.uuid, child.material.clone());
        }
        
        child.material.transparent = true;
        child.material.opacity = opacity;
        child.material.alphaTest = 0.1;
      }
    });
    
    console.log(`Застосовано примусову напівпрозорість (${opacity}) до всієї моделі`);
  }
  
  setPulseEnabled(enabled) {
    this.pulseEnabled = enabled;
    console.log('Пульсація', enabled ? 'увімкнена' : 'вимкнена');
  }
  
  update() {
    if (!this.pulseEnabled || this.glowMeshes.length === 0) {
      return;
    }
    
    const time = Date.now() * 0.001;
    const pulse = Math.sin(time * this.pulseSpeed) * 0.5 + 0.5;
    const intensity = this.params.intensity * (0.5 + pulse * this.pulseIntensity);
    
    if (this.glowMode === 'emissive') {
      // Оновлення emissive властивостей тільки для прозорих матеріалів
      this.glowMeshes.forEach(mesh => {
        if (mesh.material && mesh.material.emissive && mesh.material.transparent) {
          const glowColor = new THREE.Color().setHSL(this.params.hue, 1, 0.4 + intensity * 0.2);
          mesh.material.emissive.copy(glowColor);
          mesh.material.emissiveIntensity = intensity * 0.3;
          
          // Також модулюємо прозорість для додаткового ефекту
          const baseOpacity = this.originalMaterials.get(mesh.uuid)?.opacity || 0.7;
          mesh.material.opacity = Math.max(0.3, baseOpacity * (0.7 + intensity * 0.3));
        }
      });
    } else {
      // Оновлення окремих glow мешів
      this.glowMeshes.forEach(mesh => {
        if (mesh.material) {
          const lightness = 0.3 + intensity * 0.2;
          mesh.material.color.setHSL(this.params.hue, 1, lightness);
          mesh.material.opacity = 0.4 + intensity * 0.2;
        }
      });
    }
  }
  
  dispose() {
    this.clearGlowMeshes();
  }
}