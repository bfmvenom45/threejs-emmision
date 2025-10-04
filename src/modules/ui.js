export class UIManager {
  constructor() {
    this.bloomCallback = null;
    this.glowCallback = null;
    this.pulseCallback = null;
    this.bloomModeCallback = null;
    this.modelSelectorCallback = null;
    
    this.pulseEnabled = false;
    this.currentModel = 'House15.glb';
    this.glowMode = 'emissive';
  }
  
  setupBloomControls(callback) {
    this.bloomCallback = callback;
    
    // Слайдери bloom
    this.setupSlider('strength', 'strength-value', (value) => {
      callback({ bloomStrength: parseFloat(value) });
    });
    
    this.setupSlider('threshold', 'threshold-value', (value) => {
      callback({ bloomThreshold: parseFloat(value) });
    });
    
    this.setupSlider('radius', 'radius-value', (value) => {
      callback({ bloomRadius: parseFloat(value) });
    });
    
    this.setupSlider('exposure', 'exposure-value', (value) => {
      callback({ exposure: parseFloat(value) });
    });
  }
  
  setupGlowControls(callback) {
    this.glowCallback = callback;
    
    this.setupSlider('glow-intensity', 'glow-intensity-value', (value) => {
      callback({ intensity: parseFloat(value) });
    });
    
    this.setupSlider('glow-hue', 'glow-hue-value', (value) => {
      callback({ hue: parseFloat(value) });
    });
  }
  
  setupPulseControl(callback) {
    this.pulseCallback = callback;
    
    const pulseButton = document.getElementById('pulse-button');
    if (pulseButton) {
      pulseButton.addEventListener('click', () => {
        this.pulseEnabled = !this.pulseEnabled;
        this.updatePulseButton();
        callback(this.pulseEnabled);
      });
    }
  }
  
  setupBloomModeControl(callback) {
    this.bloomModeCallback = callback;
    
    const bloomModeRadios = document.querySelectorAll('input[name=\"bloom-mode\"]');
    bloomModeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          callback(e.target.value);
        }
      });
    });
  }
  
  setupGlowModeControl(callback) {
    this.glowModeCallback = callback;
    
    const glowModeRadios = document.querySelectorAll('input[name=\"glow-mode\"]');
    glowModeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          callback(e.target.value);
        }
      });
    });
  }
  
  setupModelSelector(callback, fileCallback) {
    this.modelSelectorCallback = callback;
    this.fileUploadCallback = fileCallback;
    
    const modelCards = document.querySelectorAll('.model-card');
    modelCards.forEach(card => {
      card.addEventListener('click', () => {
        const modelPath = card.dataset.model;
        
        // Оновлення активної карточки
        modelCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        
        // Приховуємо інформацію про файл
        this.clearFileInfo();
        
        this.currentModel = modelPath;
        callback(modelPath);
      });
    });
    
    // Обробка завантаження файлів
    this.setupFileUpload();
  }
  
  setupFileUpload() {
    const fileInput = document.getElementById('file-input');
    const uploadButton = document.getElementById('upload-button');
    const clearButton = document.getElementById('clear-file');
    
    if (uploadButton && fileInput) {
      uploadButton.addEventListener('click', () => {
        fileInput.click();
      });
      
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.handleFileUpload(file);
        }
      });
    }
    
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        this.clearFileInfo();
        if (fileInput) fileInput.value = '';
      });
    }
  }
  
  handleFileUpload(file) {
    // Показуємо інформацію про файл
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    
    if (fileInfo && fileName) {
      fileName.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
      fileInfo.classList.remove('hidden');
    }
    
    // Прибираємо активні карточки
    const modelCards = document.querySelectorAll('.model-card');
    modelCards.forEach(c => c.classList.remove('active'));
    
    // Викликаємо callback для завантаження
    if (this.fileUploadCallback) {
      this.fileUploadCallback(file);
    }
  }
  
  clearFileInfo() {
    const fileInfo = document.getElementById('file-info');
    if (fileInfo) {
      fileInfo.classList.add('hidden');
    }
  }
  
  setupGlowSettings(callback) {
    this.glowSettingsCallback = callback;
    
    const applyButton = document.getElementById('apply-glow-settings');
    if (applyButton) {
      applyButton.addEventListener('click', () => {
        const settings = {
          eyes: document.getElementById('glow-eyes')?.checked || false,
          lights: document.getElementById('glow-lights')?.checked || false,
          transparent: document.getElementById('glow-transparent')?.checked || false,
          emissive: document.getElementById('glow-emissive')?.checked || false,
          all: document.getElementById('glow-all')?.checked || false
        };
        
        console.log('🎯 Налаштування свічення:', settings);
        callback(settings);
      });
    }
  }
  
  setupCustomLightingControls(callback) {
    this.lightingCallback = callback;
    
    // Слайдери освітлення
    this.setupSlider('main-light-intensity', 'main-light-value', (value) => {
      callback({ mainIntensity: parseFloat(value) });
    });
    
    this.setupSlider('inner-light-intensity', 'inner-light-value', (value) => {
      callback({ innerIntensity: parseFloat(value) });
    });
    
    this.setupSlider('bottom-light-intensity', 'bottom-light-value', (value) => {
      callback({ bottomIntensity: parseFloat(value) });
    });
    
    // Колір внутрішнього світла
    const colorPicker = document.getElementById('inner-light-color');
    if (colorPicker) {
      colorPicker.addEventListener('input', (e) => {
        callback({ innerColor: e.target.value });
      });
    }
    
    // Кнопка переключення освітлення
    const toggleButton = document.getElementById('toggle-lighting');
    if (toggleButton) {
      let useCustomLighting = true;
      toggleButton.addEventListener('click', () => {
        useCustomLighting = !useCustomLighting;
        callback({ 
          toggleLighting: true, 
          useCustom: useCustomLighting 
        });
        
        toggleButton.textContent = useCustomLighting 
          ? '🔄 Оригінальне/Власне світло (Власне)' 
          : '🔄 Оригінальне/Власне світло (Оригінальне)';
      });
    }
  }
  
  setupSlider(sliderId, valueId, callback) {
    const slider = document.getElementById(sliderId);
    const valueDisplay = document.getElementById(valueId);
    
    if (slider && valueDisplay) {
      slider.addEventListener('input', (e) => {
        const value = e.target.value;
        valueDisplay.textContent = value;
        callback(value);
      });
      
      // Ініціалізація початкового значення
      valueDisplay.textContent = slider.value;
    } else {
      console.warn(`Не знайдено елементи для слайдера: ${sliderId}`);
    }
  }
  
  updatePulseButton() {
    const pulseButton = document.getElementById('pulse-button');
    if (pulseButton) {
      pulseButton.textContent = this.pulseEnabled ? 
        '🔴 Вимкнути пульсацію' : 
        '💫 Увімкнути пульсацію';
      
      pulseButton.style.background = this.pulseEnabled ?
        'linear-gradient(45deg, #ff6b6b 0%, #ee5a52 100%)' :
        'linear-gradient(45deg, #667eea 0%, #764ba2 100%)';
    }
  }
  
  setLoading(isLoading) {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
      if (isLoading) {
        loadingIndicator.classList.remove('hidden');
      } else {
        loadingIndicator.classList.add('hidden');
      }
    }
  }
  
  showNotification(message, type = 'info') {
    // Створення та показ сповіщення
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Стилі для сповіщення
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '12px 20px',
      borderRadius: '8px',
      color: 'white',
      fontSize: '14px',
      fontWeight: '500',
      zIndex: '10000',
      opacity: '0',
      transition: 'opacity 0.3s ease',
      pointerEvents: 'none'
    });
    
    // Кольори залежно від типу
    const colors = {
      info: 'rgba(79, 158, 255, 0.9)',
      success: 'rgba(76, 175, 80, 0.9)',
      warning: 'rgba(255, 193, 7, 0.9)',
      error: 'rgba(244, 67, 54, 0.9)'
    };
    
    notification.style.background = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    // Анімація появи
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
    });
    
    // Автоматичне приховання
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
  
  updateModelPreview(modelPath) {
    // Оновлення превью моделі (якщо потрібно)
    const modelCards = document.querySelectorAll('.model-card');
    modelCards.forEach(card => {
      if (card.dataset.model === modelPath) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }
  
  getControlValues() {
    return {
      bloomStrength: parseFloat(document.getElementById('strength')?.value || 1),
      bloomThreshold: parseFloat(document.getElementById('threshold')?.value || 0.1),
      bloomRadius: parseFloat(document.getElementById('radius')?.value || 0.55),
      exposure: parseFloat(document.getElementById('exposure')?.value || 0.1),
      glowIntensity: parseFloat(document.getElementById('glow-intensity')?.value || 2.9),
      glowHue: parseFloat(document.getElementById('glow-hue')?.value || 0.06),
      bloomMode: document.querySelector('input[name=\"bloom-mode\"]:checked')?.value || 'simple',
      currentModel: this.currentModel
    };
  }
}