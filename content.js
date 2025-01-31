class WorldClock {
  constructor() {
    this.settings = {
      theme: 'dark',
      format24h: true,
      position: 'bottom-right'
    };
    
    this.positions = {
      'top-left': { top: '10px', left: '10px', bottom: 'auto', right: 'auto' },
      'top-right': { top: '10px', right: '10px', bottom: 'auto', left: 'auto' },
      'bottom-left': { bottom: '10px', left: '10px', top: 'auto', right: 'auto' },
      'bottom-right': { bottom: '10px', right: '10px', top: 'auto', left: 'auto' }
    };

    this.container = null;
    this.updateInterval = null;
  }

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .world-clock-container {
        position: fixed;
        z-index: 10000;
        padding: 15px;
        border-radius: 8px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        min-width: 200px;
        text-align: center;
        transition: all 0.3s ease;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        cursor: move;
        user-select: none;
      }

      .world-clock-container.light {
        background: rgba(255, 255, 255, 0.95);
        color: #1a1a1a;
        border: 1px solid rgba(204, 204, 204, 0.3);
      }

      .world-clock-container.dark {
        background: rgba(40, 40, 40, 0.95);
        color: #ffffff;
        border: 1px solid rgba(102, 102, 102, 0.3);
      }

      .clock-time {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 8px;
      }

      .clock-date {
        font-size: 14px;
        margin-bottom: 5px;
      }

      .clock-timezone {
        font-size: 12px;
        opacity: 0.8;
      }

      .sync-status {
        font-size: 10px;
        margin-top: 5px;
        opacity: 0.6;
      }
    `;
    document.head.appendChild(style);
  }

  createClockElement() {
    this.container = document.createElement('div');
    this.container.className = `world-clock-container ${this.settings.theme}`;
    Object.assign(this.container.style, this.positions[this.settings.position]);
    
    this.container.innerHTML = `
      <div class="clock-time">--:--:--</div>
      <div class="clock-date">--/--/----</div>
      <div class="clock-timezone">Europe/Paris</div>
      <div class="sync-status">Synchronisation...</div>
    `;

    document.body.appendChild(this.container);
    this.initializeDragAndDrop();
  }

  initializeDragAndDrop() {
    let isDragging = false;
    let initialX;
    let initialY;

    this.container.addEventListener('mousedown', (e) => {
      isDragging = true;
      initialX = e.clientX - this.container.offsetLeft;
      initialY = e.clientY - this.container.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      
      const newX = e.clientX - initialX;
      const newY = e.clientY - initialY;
      
      this.container.style.left = `${newX}px`;
      this.container.style.top = `${newY}px`;
      this.container.style.right = 'auto';
      this.container.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  async fetchTime() {
    try {
      const response = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=Europe/Paris');
      if (!response.ok) throw new Error('Erreur réseau');
      return await response.json();
    } catch (error) {
      console.error('Erreur timeapi.io:', error);
      return null;
    }
  }

  formatTime(timeData) {
    if (!timeData) return '--:--:--';
    
    const hours = this.settings.format24h ? 
      timeData.hour.toString().padStart(2, '0') : 
      (timeData.hour % 12 || 12).toString().padStart(2, '0');
    const minutes = timeData.minute.toString().padStart(2, '0');
    const seconds = timeData.seconds.toString().padStart(2, '0');
    const ampm = !this.settings.format24h ? (timeData.hour >= 12 ? ' PM' : ' AM') : '';
    
    return `${hours}:${minutes}:${seconds}${ampm}`;
  }

  formatDate(timeData) {
    if (!timeData) return '--/--/----';
    
    const date = new Date(
      timeData.year,
      timeData.month - 1,
      timeData.day
    );
    
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  async updateClock() {
    const timeData = await this.fetchTime();
    
    if (!this.container) return;

    const timeEl = this.container.querySelector('.clock-time');
    const dateEl = this.container.querySelector('.clock-date');
    const statusEl = this.container.querySelector('.sync-status');

    if (timeData) {
      timeEl.textContent = this.formatTime(timeData);
      dateEl.textContent = this.formatDate(timeData);
      statusEl.textContent = 'Synchronisé';
    } else {
      statusEl.textContent = 'Erreur de synchronisation';
    }
  }

  startUpdates() {
    this.updateClock();
    this.updateInterval = setInterval(() => this.updateClock(), 1000);
  }

  async initialize() {
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['theme', 'format24h', 'position'], resolve);
    });
    
    this.settings = { ...this.settings, ...result };
    this.injectStyles();
    this.createClockElement();
    this.startUpdates();

    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'updateSettings') {
        this.settings = { ...this.settings, ...message.settings };
        this.container.className = `world-clock-container ${this.settings.theme}`;
        
        if (message.settings.position) {
          Object.assign(this.container.style, this.positions[message.settings.position]);
        }
      }
    });
  }
}

new WorldClock().initialize();