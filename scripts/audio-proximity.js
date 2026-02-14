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
    this.updateInterval = 150; // ms - increased for smoother performance
    this.lastUpdate = 0;
    this.lastSpeakTime = 0;
    this.speakDebounce = 300; // ms - prevent rapid switching

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
    // Collect ALL text elements and images - be maximally comprehensive
    this.elements = [];
    const collected = new Set();

    // Function to check if element is visible
    const isVisible = (el) => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' &&
             style.visibility !== 'hidden' &&
             style.opacity !== '0';
    };

    // Get ALL elements in the document
    const allElements = document.body.querySelectorAll('*');

    allElements.forEach(el => {
      // Skip if control element or already collected
      if (this.isControlElement(el) || collected.has(el)) return;
      if (!isVisible(el)) return;

      const text = el.textContent.trim();
      if (!text || text.length < 3) return;

      // Check if this element has ANY text nodes (direct children)
      const hasOwnText = Array.from(el.childNodes).some(node =>
        node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0
      );

      if (!hasOwnText) return;

      // Check if nested in already collected element
      const isNested = Array.from(collected).some(collectedEl =>
        collectedEl !== el && collectedEl.contains(el)
      );

      if (isNested) return;

      // Collect this element
      const elementType = el.tagName.match(/^H[1-6]$/) ? 'header' : 'text';
      this.elements.push({
        element: el,
        text: text,
        type: elementType,
        bounds: null
      });
      collected.add(el);

      // Mark all descendants as collected to avoid duplicates
      const descendants = el.querySelectorAll('*');
      descendants.forEach(desc => collected.add(desc));
    });

    // Get all images with alt text (separate pass)
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (!this.isControlElement(img) && isVisible(img)) {
        const alt = img.alt || img.title || 'Image';
        this.elements.push({
          element: img,
          text: `Image: ${alt}`,
          type: 'image',
          bounds: null,
          imageSrc: img.src
        });
      }
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

    // Update element bounds on scroll
    document.addEventListener('scroll', () => {
      if (this.isAudioMode) {
        this.updateElementBounds();
      }
    }, { passive: true });

    // Update element bounds on window resize
    window.addEventListener('resize', () => {
      if (this.isAudioMode) {
        this.updateElementBounds();
      }
    }, { passive: true });

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

    // Create floating display (above overlay) - can show text or images
    this.floatingDisplay = document.createElement('div');
    this.floatingDisplay.id = 'audio-proximity-floating-display';
    this.floatingDisplay.style.cssText = `
      position: fixed;
      z-index: 9999;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
      display: none;
      transform-origin: center center;
    `;

    this.floatingText = document.createElement('div');
    this.floatingText.style.cssText = `
      color: white;
      font-size: 20px;
      font-weight: bold;
      padding: 15px 25px;
      background-color: rgba(0, 0, 0, 0.95);
      border-radius: 10px;
      text-shadow: 0 0 20px rgba(255, 255, 255, 0.9),
                   0 0 40px rgba(255, 255, 255, 0.6),
                   0 0 60px rgba(255, 255, 255, 0.3);
      box-shadow: 0 0 50px rgba(255, 255, 255, 0.7),
                  inset 0 0 20px rgba(255, 255, 255, 0.1);
      max-width: 600px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-wrap: break-word;
    `;

    this.floatingImage = document.createElement('img');
    this.floatingImage.style.cssText = `
      max-width: 500px;
      max-height: 400px;
      border-radius: 10px;
      box-shadow: 0 0 60px rgba(255, 255, 255, 0.9),
                  0 0 100px rgba(255, 255, 255, 0.5);
      filter: brightness(1.2) drop-shadow(0 0 30px rgba(255, 255, 255, 0.9));
      display: none;
    `;

    this.floatingDisplay.appendChild(this.floatingText);
    this.floatingDisplay.appendChild(this.floatingImage);
    document.body.appendChild(this.floatingDisplay);

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

    // Remove floating display
    if (this.floatingDisplay) {
      this.floatingDisplay.remove();
      this.floatingDisplay = null;
      this.floatingText = null;
      this.floatingImage = null;
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

    // Speak the closest element (with debouncing for smoother transitions)
    const timeSinceLastSpeak = now - this.lastSpeakTime;

    if (closestElement && closestElement !== this.currentSpeaking) {
      // Only switch if enough time has passed (prevents rapid switching)
      if (timeSinceLastSpeak > this.speakDebounce || !this.currentSpeaking) {
        // Remove highlight from previous element
        if (this.currentSpeaking) {
          this.fadeOutElement(this.currentSpeaking.element);
        }

        const volume = this.calculateVolume(closestDistance);
        this.speak(closestElement.text, volume);
        this.fadeInElement(closestElement.element, closestDistance);
        this.currentSpeaking = closestElement;
        this.lastSpeakTime = now;
      }
    } else if (!closestElement && this.currentSpeaking) {
      // No element in range, stop speaking
      this.fadeOutElement(this.currentSpeaking.element);
      this.stopSpeech();
      this.currentSpeaking = null;
    } else if (closestElement && closestElement === this.currentSpeaking) {
      // Same element, just update position smoothly
      this.updateFloatingTextPosition(closestElement.element);
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

  detectLanguage(text) {
    // Simple French detection - check for common French words/characters
    const frenchIndicators = /\b(le|la|les|un|une|des|et|est|dans|pour|avec|que|qui|sur|par|plus|comme|mais|ou|où|cette|sont|été|être|avoir|nous|vous|ils|elles|français|française)\b/i;
    const frenchChars = /[àâäæçéèêëïîôùûüÿœ]/i;

    return frenchIndicators.test(text) || frenchChars.test(text);
  }

  speak(text, volume = 1) {
    // Stop current speech
    this.stopSpeech();

    // Create new utterance
    this.currentUtterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance.volume = volume;
    this.currentUtterance.rate = 1.0;
    this.currentUtterance.pitch = 1.0;

    // Detect language and set appropriate voice
    const isFrench = this.detectLanguage(text);
    if (isFrench) {
      this.currentUtterance.lang = 'fr-FR';
      // Try to find a French voice
      const voices = this.synth.getVoices();
      const frenchVoice = voices.find(voice => voice.lang.startsWith('fr'));
      if (frenchVoice) {
        this.currentUtterance.voice = frenchVoice;
      }
    } else {
      this.currentUtterance.lang = 'en-US';
    }

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

  fadeInElement(element, distance) {
    if (!this.floatingDisplay || !this.floatingText || !this.floatingImage) return;

    const item = this.elements.find(el => el.element === element);
    if (!item) return;

    // Position near mouse cursor (more stable than element position)
    const offsetX = 20;
    const offsetY = 20;
    this.floatingDisplay.style.left = `${this.mouseX + offsetX}px`;
    this.floatingDisplay.style.top = `${this.mouseY + offsetY}px`;

    if (item.type === 'image' && item.imageSrc) {
      // Show image
      this.floatingImage.src = item.imageSrc;
      this.floatingImage.style.display = 'block';
      this.floatingText.style.display = 'none';
    } else {
      // Show text
      const text = element.textContent.trim();
      const displayText = text.length > 400 ? text.substring(0, 400) + '...' : text;
      this.floatingText.textContent = displayText;

      // Adjust font size based on element type
      if (element.tagName && element.tagName.match(/^H[1-6]$/)) {
        this.floatingText.style.fontSize = '28px';
        this.floatingText.style.fontWeight = '900';
      } else {
        this.floatingText.style.fontSize = '20px';
        this.floatingText.style.fontWeight = 'bold';
      }

      this.floatingText.style.display = 'block';
      this.floatingImage.style.display = 'none';
    }

    // Show floating display
    this.floatingDisplay.style.display = 'block';
    this.floatingDisplay.offsetHeight; // Force reflow
    this.floatingDisplay.style.opacity = '1';
  }

  updateFloatingTextPosition(element) {
    if (!this.floatingDisplay || this.floatingDisplay.style.opacity === '0') return;

    // Update position to follow mouse smoothly
    const offsetX = 20;
    const offsetY = 20;
    this.floatingDisplay.style.left = `${this.mouseX + offsetX}px`;
    this.floatingDisplay.style.top = `${this.mouseY + offsetY}px`;
  }

  fadeOutElement(element) {
    if (!this.floatingDisplay) return;

    // Hide floating display
    this.floatingDisplay.style.opacity = '0';

    setTimeout(() => {
      if (this.floatingDisplay) {
        this.floatingDisplay.style.display = 'none';
        if (this.floatingImage) this.floatingImage.style.display = 'none';
        if (this.floatingText) this.floatingText.style.display = 'none';
      }
    }, 300);
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
