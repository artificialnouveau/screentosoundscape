/**
 * Audio Proximity Interaction Module
 * Enables audio-only mode where content is read aloud based on mouse proximity
 */

class AudioProximityController {
  constructor() {
    this.isAudioMode = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.elements = [];
    this.currentSpeaking = null;
    this.proximityThreshold = 600; // pixels - max distance for audio
    this.minVolume = 0;
    this.maxVolume = 1;
    this.updateInterval = 100; // ms
    this.lastUpdate = 0;

    // Speech synthesis
    this.synth = window.speechSynthesis;
    this.currentUtterance = null;

    this.init();
  }

  init() {
    this.injectStyles();
    this.createToggleButtons();
    this.collectElements();
    this.setupEventListeners();
  }

  injectStyles() {
    // Add CSS for fade in/out effect
    const style = document.createElement('style');
    style.textContent = `
      #audio-mode-overlay {
        pointer-events: none !important;
      }

      .audio-proximity-speaking {
        position: relative !important;
        z-index: 9999 !important;
        animation: audioProximityFadeIn 0.5s ease-in-out forwards;
        color: white !important;
        background-color: rgba(0, 0, 0, 0.8) !important;
        padding: 2px 4px !important;
        border-radius: 3px !important;
        text-shadow: 0 0 20px rgba(255, 255, 255, 0.9),
                     0 0 40px rgba(255, 255, 255, 0.6),
                     0 0 60px rgba(255, 255, 255, 0.3) !important;
        box-shadow: 0 0 30px rgba(255, 255, 255, 0.5) !important;
      }

      .audio-proximity-speaking * {
        color: white !important;
        text-shadow: inherit !important;
      }

      img.audio-proximity-speaking {
        background-color: transparent !important;
        box-shadow: 0 0 40px rgba(255, 255, 255, 0.8) !important;
        filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.9)) !important;
      }

      .audio-proximity-fading-out {
        animation: audioProximityFadeOut 0.5s ease-in-out forwards;
      }

      @keyframes audioProximityFadeIn {
        0% {
          opacity: 0;
          transform: scale(0.95);
          text-shadow: 0 0 0px rgba(255, 255, 255, 0);
          box-shadow: 0 0 0px rgba(255, 255, 255, 0);
        }
        100% {
          opacity: 1;
          transform: scale(1);
          text-shadow: 0 0 20px rgba(255, 255, 255, 0.9),
                       0 0 40px rgba(255, 255, 255, 0.6),
                       0 0 60px rgba(255, 255, 255, 0.3);
          box-shadow: 0 0 30px rgba(255, 255, 255, 0.5);
        }
      }

      @keyframes audioProximityFadeOut {
        0% {
          opacity: 1;
          transform: scale(1);
          text-shadow: 0 0 20px rgba(255, 255, 255, 0.9),
                       0 0 40px rgba(255, 255, 255, 0.6),
                       0 0 60px rgba(255, 255, 255, 0.3);
          box-shadow: 0 0 30px rgba(255, 255, 255, 0.5);
        }
        100% {
          opacity: 0;
          transform: scale(0.95);
          text-shadow: 0 0 0px rgba(255, 255, 255, 0);
          box-shadow: 0 0 0px rgba(255, 255, 255, 0);
        }
      }
    `;
    document.head.appendChild(style);
  }

  createToggleButtons() {
    // Create button container
    const container = document.createElement('div');
    container.id = 'audio-proximity-controls';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      gap: 10px;
    `;

    // "No visuals, only audio" button
    this.audioOnlyBtn = document.createElement('button');
    this.audioOnlyBtn.id = 'audio-only-btn';
    this.audioOnlyBtn.textContent = 'No visuals, only audio';
    this.audioOnlyBtn.style.cssText = `
      padding: 12px 20px;
      background-color: #2c3e50;
      color: white;
      border: 2px solid #34495e;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
    `;

    // "Only visuals, no audio" button (initially hidden)
    this.visualOnlyBtn = document.createElement('button');
    this.visualOnlyBtn.id = 'visual-only-btn';
    this.visualOnlyBtn.textContent = 'Only visuals, no audio';
    this.visualOnlyBtn.style.cssText = `
      padding: 12px 20px;
      background-color: #27ae60;
      color: white;
      border: 2px solid #229954;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
      display: none;
    `;

    // Hover effects
    this.audioOnlyBtn.addEventListener('mouseenter', () => {
      this.audioOnlyBtn.style.backgroundColor = '#34495e';
      this.audioOnlyBtn.style.transform = 'scale(1.05)';
    });
    this.audioOnlyBtn.addEventListener('mouseleave', () => {
      this.audioOnlyBtn.style.backgroundColor = '#2c3e50';
      this.audioOnlyBtn.style.transform = 'scale(1)';
    });

    this.visualOnlyBtn.addEventListener('mouseenter', () => {
      this.visualOnlyBtn.style.backgroundColor = '#229954';
      this.visualOnlyBtn.style.transform = 'scale(1.05)';
    });
    this.visualOnlyBtn.addEventListener('mouseleave', () => {
      this.visualOnlyBtn.style.backgroundColor = '#27ae60';
      this.visualOnlyBtn.style.transform = 'scale(1)';
    });

    container.appendChild(this.audioOnlyBtn);
    container.appendChild(this.visualOnlyBtn);
    document.body.appendChild(container);
  }

  collectElements() {
    // Collect all text elements and images
    this.elements = [];

    // Get all text-containing elements
    const textSelectors = 'p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, figcaption, span, a, button, label';
    const textElements = document.querySelectorAll(textSelectors);

    textElements.forEach(el => {
      const text = el.textContent.trim();
      if (text && !this.isControlElement(el)) {
        this.elements.push({
          element: el,
          text: text,
          type: 'text',
          bounds: null
        });
      }
    });

    // Get all images with alt text
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      const alt = img.alt || 'Image';
      this.elements.push({
        element: img,
        text: `Image: ${alt}`,
        type: 'image',
        bounds: null
      });
    });

    console.log(`Collected ${this.elements.length} elements for audio proximity`);
  }

  isControlElement(el) {
    // Check if element is part of the control buttons
    return el.closest('#audio-proximity-controls') !== null;
  }

  setupEventListeners() {
    // Toggle audio mode
    this.audioOnlyBtn.addEventListener('click', () => this.enableAudioMode());
    this.visualOnlyBtn.addEventListener('click', () => this.disableAudioMode());

    // Track mouse movement
    document.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    // Update proximity audio
    setInterval(() => {
      if (this.isAudioMode) {
        this.updateProximityAudio();
      }
    }, this.updateInterval);
  }

  enableAudioMode() {
    this.isAudioMode = true;

    // Hide audio-only button, show visual-only button
    this.audioOnlyBtn.style.display = 'none';
    this.visualOnlyBtn.style.display = 'block';

    // Create black overlay
    this.overlay = document.createElement('div');
    this.overlay.id = 'audio-mode-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: black;
      z-index: 9998;
      pointer-events: none;
    `;
    document.body.appendChild(this.overlay);

    // Ensure control buttons stay visible
    document.getElementById('audio-proximity-controls').style.zIndex = '10000';

    // Update element bounds
    this.updateElementBounds();

    console.log('Audio mode enabled');
  }

  disableAudioMode() {
    this.isAudioMode = false;

    // Show audio-only button, hide visual-only button
    this.audioOnlyBtn.style.display = 'block';
    this.visualOnlyBtn.style.display = 'none';

    // Remove black overlay
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }

    // Remove highlight from current element
    if (this.currentSpeaking) {
      this.currentSpeaking.element.classList.remove('audio-proximity-speaking');
      this.currentSpeaking.element.classList.remove('audio-proximity-fading-out');
    }

    // Stop any ongoing speech
    this.stopSpeech();
    this.currentSpeaking = null;

    console.log('Audio mode disabled');
  }

  updateElementBounds() {
    // Update bounding boxes for all elements
    this.elements.forEach(item => {
      const rect = item.element.getBoundingClientRect();
      item.bounds = {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
        right: rect.right + window.scrollX,
        bottom: rect.bottom + window.scrollY,
        centerX: rect.left + window.scrollX + rect.width / 2,
        centerY: rect.top + window.scrollY + rect.height / 2
      };
    });
  }

  updateProximityAudio() {
    if (!this.isAudioMode) return;

    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval) return;
    this.lastUpdate = now;

    // Find closest element to mouse
    let closestElement = null;
    let closestDistance = Infinity;

    this.elements.forEach(item => {
      if (!item.bounds) return;

      const distance = this.calculateDistance(
        this.mouseX + window.scrollX,
        this.mouseY + window.scrollY,
        item.bounds.centerX,
        item.bounds.centerY
      );

      if (distance < closestDistance && distance < this.proximityThreshold) {
        closestDistance = distance;
        closestElement = item;
      }
    });

    // Speak the closest element
    if (closestElement && closestElement !== this.currentSpeaking) {
      // Remove highlight from previous element
      if (this.currentSpeaking) {
        this.fadeOutElement(this.currentSpeaking.element);
      }

      const volume = this.calculateVolume(closestDistance);
      this.speak(closestElement.text, volume);
      this.fadeInElement(closestElement.element);
      this.currentSpeaking = closestElement;
    } else if (!closestElement && this.currentSpeaking) {
      // No element in range, stop speaking
      this.fadeOutElement(this.currentSpeaking.element);
      this.stopSpeech();
      this.currentSpeaking = null;
    } else if (closestElement && closestElement === this.currentSpeaking) {
      // Same element, update volume
      const volume = this.calculateVolume(closestDistance);
      this.updateVolume(volume);
    }
  }

  calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  calculateVolume(distance) {
    // Volume decreases linearly with distance
    // At distance 0: volume = 1
    // At distance = proximityThreshold: volume = 0
    const normalized = 1 - (distance / this.proximityThreshold);
    return Math.max(this.minVolume, Math.min(this.maxVolume, normalized));
  }

  speak(text, volume = 1) {
    // Stop current speech
    this.stopSpeech();

    // Create new utterance
    this.currentUtterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance.volume = volume;
    this.currentUtterance.rate = 1.0;
    this.currentUtterance.pitch = 1.0;

    // Speak
    this.synth.speak(this.currentUtterance);
  }

  updateVolume(volume) {
    // Note: SpeechSynthesisUtterance volume can't be changed after speaking starts
    // We would need to restart the speech with new volume, but that would be jarring
    // Instead, we'll just use the volume at the start of speech
    // For better volume control, we'd need to use Web Audio API with recorded audio
  }

  stopSpeech() {
    this.synth.cancel();
    this.currentUtterance = null;
  }

  fadeInElement(element) {
    // Remove any existing fade classes
    element.classList.remove('audio-proximity-fading-out');
    // Add fade in class
    element.classList.add('audio-proximity-speaking');
  }

  fadeOutElement(element) {
    // Add fade out class
    element.classList.add('audio-proximity-fading-out');

    // Remove all classes after animation completes
    setTimeout(() => {
      element.classList.remove('audio-proximity-speaking');
      element.classList.remove('audio-proximity-fading-out');
    }, 500); // Match animation duration
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.audioProximityController = new AudioProximityController();
  });
} else {
  window.audioProximityController = new AudioProximityController();
}
