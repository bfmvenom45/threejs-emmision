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
    this.currentModelName = 'House15.glb';
    
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
    
    // Drag & Drop функціональність
    this.setupDragAndDrop();
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
      
      // Застосування всіх ефектів
      this.applyAllEffects(model, modelPath);
      
    } catch (error) {
      console.error('Помилка завантаження моделі:', error);
      this.hideLoading();
      this.uiManager.showNotification(`Помилка завантаження ${modelPath}: ${error.message}`, 'error');
    }
  }
  
  async loadModelFromFile(file) {
    try {
      this.showLoading();
      this.uiManager.showNotification(`Завантаження файлу ${file.name}...`, 'info');
      
      // Видалення попередньої моделі
      if (this.currentModel) {
        this.sceneManager.scene.remove(this.currentModel);
        this.glowManager.clearGlowMeshes();
      }
      
      // Завантаження моделі з файлу
      const model = await this.modelLoader.loadFromFile(file);
      this.currentModel = model;
      
      // Застосування всіх ефектів
      this.applyAllEffects(model, file.name);
      
    } catch (error) {
      console.error('Помилка завантаження файлу:', error);
      this.hideLoading();
      this.uiManager.showNotification(`Помилка завантаження ${file.name}: ${error.message}`, 'error');
    }
  }
  
  applyAllEffects(model, modelName) {
    try {
      // Додавання до сцени
      this.sceneManager.scene.add(model);
      
      // Додавання власного освітлення
      this.sceneManager.addCustomLighting(model);
      
      // Додавання glow ефекту з налаштуваннями за замовчуванням
      this.glowManager.addInnerGlow(model);
      
      // Оновлення bloom шарів
      this.bloomManager.setupModelLayers(model);
      
      this.hideLoading();
      this.uiManager.showNotification(`${modelName} успішно завантажено та налаштовано!`, 'success');
      console.log(`Модель ${modelName} успішно завантажена та налаштована`);
      
    } catch (error) {
      console.error('Помилка застосування ефектів:', error);
      this.hideLoading();
      this.uiManager.showNotification(`Помилка застосування ефектів до ${modelName}`, 'error');
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
    });
    
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
    this.uiManager.setupModelSelector(
      (modelPath) => {
        this.currentModelName = modelPath;
        this.loadModel(modelPath);
      },
      (file) => {
        this.loadModelFromFile(file);
      }
    );
    
    // Налаштування свічення об'єктів
    this.uiManager.setupGlowSettings((settings) => {
      this.glowManager.updateGlowSettings(settings);
      // Перезастосовуємо glow з новими налаштуваннями
      if (this.currentModel) {
        this.glowManager.addInnerGlow(this.currentModel);
        this.uiManager.showNotification('Налаштування світіння оновлено!', 'success');
      }
    });
    
    // Налаштування власного освітлення
    this.uiManager.setupCustomLightingControls((params) => {
      this.sceneManager.updateCustomLighting(params);
    });
  }
  
  setupEventListeners() {
    // Обробка зміни розміру вікна
    window.addEventListener('resize', () => {
      this.sceneManager.onWindowResize();
      this.bloomManager.onWindowResize();
    });
  }
  
  setupDragAndDrop() {
    const canvas = this.canvas;
    
    // Запобігаємо стандартній поведінці браузера
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      canvas.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
    
    // Візуальні ефекти при перетягуванні
    ['dragenter', 'dragover'].forEach(eventName => {
      canvas.addEventListener(eventName, () => {
        canvas.style.filter = 'brightness(1.2) saturate(1.3)';
        canvas.style.border = '3px dashed #4f9eff';
      });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      canvas.addEventListener(eventName, () => {
        canvas.style.filter = '';
        canvas.style.border = '';
      });
    });
    
    // Обробка drop події
    canvas.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      
      if (files.length > 0) {
        const file = files[0];
        
        // Перевірка типу файлу
        if (file.name.toLowerCase().endsWith('.glb') || file.name.toLowerCase().endsWith('.gltf')) {
          this.uiManager.handleFileUpload(file);
        } else {
          this.uiManager.showNotification('Підтримуються тільки .glb та .gltf файли', 'error');
        }
      }
    });
    
    console.log('🎯 Drag & Drop налаштовано для GLB/GLTF файлів');
    
    // 🔧 Секретні гарячі клавіші для налаштувань (Ctrl/Cmd + Shift + S)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        const controlsPanel = document.querySelector('.controls-panel');
        if (controlsPanel) {
          const isHidden = controlsPanel.style.display === 'none';
          controlsPanel.style.display = isHidden ? 'block' : 'none';
          console.log(isHidden ? '🔧 Панель налаштувань відкрита' : '🔒 Панель налаштувань прихована');
        }
      }
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