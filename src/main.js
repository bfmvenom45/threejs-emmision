import { SceneManager } from './modules/scene.js';
import { BloomManager } from './modules/bloom.js';
import { GlowManager } from './modules/glow.js';
import { ModelLoader } from './modules/loader.js';
import { UIManager } from './modules/ui.js';

class App {
  constructor() {
    this.canvas = document.getElementById('canvas');
    this.loadingIndicator = document.getElementById('loading-indicator');
    
    this.sceneManager = new SceneManager(this.canvas);
    this.bloomManager = new BloomManager(this.sceneManager);
    this.glowManager = new GlowManager();
    this.modelLoader = new ModelLoader();
    this.uiManager = new UIManager();
    
    this.currentModel = null;
    this.currentModelName = 'House.glb';
    
    this.init();
  }
  
  async init() {
    // Ініціалізація сцени
    this.sceneManager.init();
    this.bloomManager.init();
    
    // Завантаження початкової моделі
    await this.loadModel(this.currentModelName);
    
    // Налаштування UI
    this.setupUI();
    
    // Запуск анімації
    this.animate();
    
    // Обробники подій
    this.setupEventListeners();
  }
  
  async loadModel(modelPath) {
    try {
      this.showLoading();
      this.uiManager.showNotification(`Завантаження моделі ${modelPath}...`, 'info');
      
      // Видалення попередньої моделі
      if (this.currentModel) {
        this.sceneManager.scene.remove(this.currentModel);
        this.glowManager.clearGlowMeshes();
      }
      
      // Завантаження нової моделі
      const model = await this.modelLoader.load(modelPath);
      this.currentModel = model;
      
      // Додавання до сцени
      this.sceneManager.scene.add(model);
      
      // Додавання glow ефекту
      this.glowManager.addInnerGlow(model);
      
      // Оновлення bloom шарів
      this.bloomManager.setupModelLayers(model);
      
      this.hideLoading();
      this.uiManager.showNotification(`Модель ${modelPath} успішно завантажена!`, 'success');
      console.log(`Модель ${modelPath} успішно завантажена`);
      
    } catch (error) {
      console.error('Помилка завантаження моделі:', error);
      this.hideLoading();
      this.uiManager.showNotification(`Помилка завантаження ${modelPath}: ${error.message}`, 'error');
    }
  }
  
  setupUI() {
    // Налаштування контролів bloom
    this.uiManager.setupBloomControls((params) => {
      this.bloomManager.updateParams(params);
    });
    
    // Налаштування контролів glow
    this.uiManager.setupGlowControls((params) => {
      this.glowManager.updateParams(params);
      
      // Якщо змінюється прозорість, застосовуємо до поточної моделі
      if (params.transparency && this.currentModel) {
        this.glowManager.forceTransparency(this.currentModel, params.transparency);
        // Перезастосовуємо glow після зміни прозорості
        this.glowManager.addInnerGlow(this.currentModel);
      }
    });
    
    // Налаштування контролів прозорості
    this.uiManager.setupTransparencyControls(
      (transparency) => {
        if (this.currentModel) {
          this.glowManager.forceTransparency(this.currentModel, transparency);
          this.glowManager.addInnerGlow(this.currentModel);
        }
      },
      () => {
        if (this.currentModel) {
          return this.glowManager.analyzeModelTransparency(this.currentModel);
        }
        return null;
      }
    );
    
    // Налаштування пульсації
    this.uiManager.setupPulseControl((enabled) => {
      this.glowManager.setPulseEnabled(enabled);
    });
    
    // Налаштування вибору bloom режиму
    this.uiManager.setupBloomModeControl((mode) => {
      this.bloomManager.setMode(mode);
    });
    
    // Налаштування вибору glow режиму
    this.uiManager.setupGlowModeControl((mode) => {
      this.glowManager.setGlowMode(mode);
      // Перезастосовуємо glow з новим режимом
      if (this.currentModel) {
        this.glowManager.addInnerGlow(this.currentModel);
      }
    });
    
    // Налаштування вибору моделі
    this.uiManager.setupModelSelector((modelPath) => {
      this.currentModelName = modelPath;
      this.loadModel(modelPath);
    });
  }
  
  setupEventListeners() {
    // Обробка зміни розміру вікна
    window.addEventListener('resize', () => {
      this.sceneManager.onWindowResize();
      this.bloomManager.onWindowResize();
    });
  }
  
  showLoading() {
    this.loadingIndicator.classList.remove('hidden');
  }
  
  hideLoading() {
    this.loadingIndicator.classList.add('hidden');
  }
  
  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Оновлення ефектів
    this.glowManager.update();
    this.sceneManager.update();
    
    // Рендеринг
    this.bloomManager.render();
  }
}

// Запуск програми
new App();