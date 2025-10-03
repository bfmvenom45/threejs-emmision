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
    // Модифікація оригінальних матеріалів для додання emissive glow
    model.traverse((child) => {
      if (child.isMesh && child.material) {
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
      }
    });
    
    console.log(`Додано emissive свічення до ${this.glowMeshes.length} матеріалів`);
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
  
  dispose() {
    this.clearGlowMeshes();
  }
}