import * as THREE from 'three';

export class GlowManager {
  constructor() {
    this.glowMeshes = [];
    this.originalMaterials = new Map(); // Зберігаємо оригінальні матеріали
    this.pulseEnabled = false;
    this.pulseSpeed = 3.0;
    this.pulseIntensity = 1.0;
    this.glowMode = 'emissive'; // 'separate' або 'emissive'
    
    this.params = {
      intensity: 2.9,
      hue: 0.06
    };
    
    // 🎯 Налаштування свічення
    this.glowSettings = {
      eyes: true,
      lights: true,
      transparent: true,
      emissive: true,
      all: false
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
    // Модифікація оригінальних матеріалів для додання emissive glow
    model.traverse((child) => {
      if (child.isMesh && child.material) {
        // 🎯 НАЛАШТУВАННЯ ДЛ�я SUSANNA1 - що має світитися:
        const shouldGlow = this.shouldMeshGlow(child);
        
        if (shouldGlow) {
          // Зберігаємо оригінальний матеріал
          if (!this.originalMaterials.has(child.uuid)) {
            this.originalMaterials.set(child.uuid, child.material.clone());
          }
          
          // Додаємо emissive властивості
          if (child.material.emissive) {
            const glowColor = new THREE.Color().setHSL(this.params.hue, 1, 0.3);
            child.material.emissive.copy(glowColor);
            child.material.emissiveIntensity = this.params.intensity * 0.1;
          }
          
          // Додаємо до bloom шару
          child.layers.enable(1);
          this.glowMeshes.push(child); // Зберігаємо посилання для оновлення
          
          console.log(`✨ Додано свічення до: ${child.name || 'безіменний меш'}`);
        }
      }
    });
    
    console.log(`Додано emissive свічення до ${this.glowMeshes.length} матеріалів`);
  }
  
  addSeparateGlow(model) {
    const meshesToProcess = [];
    
    // Збір тільки тих мешів, що мають світитися
    model.traverse((child) => {
      if (child.isMesh && this.shouldMeshGlow(child)) {
        meshesToProcess.push(child);
      }
    });
    
    // Створення окремих glow мешів
    meshesToProcess.forEach(mesh => {
      try {
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(this.params.hue, 1, 0.5),
          transparent: true,
          opacity: 0.2,
          side: THREE.BackSide
        });
        
        const glowMesh = new THREE.Mesh(mesh.geometry, glowMaterial);
        glowMesh.scale.multiplyScalar(1.02);
        glowMesh.layers.enable(1); // Bloom шар
        
        model.add(glowMesh);
        this.glowMeshes.push(glowMesh);
        
        console.log(`✨ Створено окремий glow для: ${mesh.name || 'безіменний меш'}`);
        
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
      // Оновлення emissive властивостей
      this.glowMeshes.forEach(mesh => {
        if (mesh.material && mesh.material.emissive) {
          const glowColor = new THREE.Color().setHSL(this.params.hue, 1, 0.3 + intensity * 0.1);
          mesh.material.emissive.copy(glowColor);
          mesh.material.emissiveIntensity = intensity * 0.15;
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
  
  // 🎯 ГОЛОВНА ФУНКЦІЯ НАЛАШТУВАННЯ - ЩО МАЄ СВІТИТИСЯ
  shouldMeshGlow(mesh) {
    // Якщо увімкнено "всі об'єкти" - світиться все
    if (this.glowSettings.all) {
      return true;
    }
    
    // ========== НАЛАШТУВАННЯ ДЛЯ SUSANNA1 ==========
    
    // 1️⃣ По назві об'єкта (найточніший спосіб)
    if (mesh.name && this.glowSettings.eyes) {
      const name = mesh.name.toLowerCase();
      
      // Світяться елементи з такими назвами:
      const eyeNames = ['eye', 'pupil', 'iris'];
      const hasEyeName = eyeNames.some(keyword => name.includes(keyword));
      if (hasEyeName) {
        console.log(`👁️ Знайдено очі для свічення: ${mesh.name}`);
        return true;
      }
    }
    
    if (mesh.name && this.glowSettings.lights) {
      const name = mesh.name.toLowerCase();
      
      // Світяться світлові елементи:
      const lightNames = [
        'light', 'glow', 'emission', 'lamp', 'bulb', 
        'neon', 'screen', 'display', 'led', 'torch'
      ];
      const hasLightName = lightNames.some(keyword => name.includes(keyword));
      if (hasLightName) {
        console.log(`💡 Знайдено світло для свічення: ${mesh.name}`);
        return true;
      }
    }
    
    // 2️⃣ По матеріалу (прозорі або emissive)
    if (mesh.material) {
      const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      
      // Світяться прозорі матеріали
      if (this.glowSettings.transparent && material.transparent && material.opacity < 0.9) {
        console.log(`🔍 Знайдено прозорий матеріал для свічення: ${mesh.name || 'безіменний'}`);
        return true;
      }
      
      // Світяться матеріали з emissive кольором
      if (this.glowSettings.emissive && material.emissive && material.emissive.getHex() > 0) {
        console.log(`✨ Знайдено emissive матеріал для свічення: ${mesh.name || 'безіменний'}`);
        return true;
      }
    }
    
    // 3️⃣ За замовчуванням - НЕ світиться
    return false;
  }
  
  // 🔧 Оновлення налаштувань світіння
  updateGlowSettings(settings) {
    this.glowSettings = { ...this.glowSettings, ...settings };
    console.log('🎯 Оновлено налаштування світіння:', this.glowSettings);
  }
  
  dispose() {
    this.clearGlowMeshes();
  }
}