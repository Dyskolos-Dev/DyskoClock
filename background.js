// background.js
const CSS = `
#world-clock-container {
  position: fixed;
  bottom: 10px;
  right: 10px;
  z-index: 10000;
  padding: 15px;
  border-radius: 8px;
  font-family: Arial, sans-serif;
  font-size: 14px;
  min-width: 200px;
  text-align: center;
}

#world-clock-container.light {
  background: rgba(255, 255, 255, 0.95);
  color: black;
  border: 1px solid #ccc;
}

#world-clock-container.dark {
  background: rgba(40, 40, 40, 0.95);
  color: white;
  border: 1px solid #666;
}

#clock-time {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 8px;
}

#clock-date {
  font-size: 14px;
  margin-bottom: 5px;
}

#clock-timezone {
  font-size: 12px;
  opacity: 0.8;
}

#sync-status {
  font-size: 10px;
  margin-top: 5px;
  opacity: 0.6;
}
`;

const POPUP_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      width: 200px;
      padding: 15px;
    }
    .setting {
      margin-bottom: 10px;
    }
    select {
      width: 100%;
      margin-top: 5px;
      padding: 5px;
    }
    button {
      width: 100%;
      padding: 8px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="setting">
    <label>Thème:</label>
    <select id="theme">
      <option value="light">Clair</option>
      <option value="dark">Sombre</option>
    </select>
  </div>
  <div class="setting">
    <label>Format:</label>
    <select id="format24h">
      <option value="true">24h</option>
      <option value="false">12h</option>
    </select>
  </div>
  <button id="save">Appliquer</button>
  <script src="background.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', initializePopup);
  </script>
</body>
</html>
`;

// Fonctions de l'extension
let settings = {
  theme: 'dark',
  format24h: true
};

async function fetchTime() {
  try {
    const response = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=Europe/Paris');
    if (!response.ok) throw new Error('Erreur réseau');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'heure:', error);
    const statusEl = document.getElementById('sync-status');
    if (statusEl) statusEl.textContent = 'Erreur de synchronisation';
    return null;
  }
}

function formatTime(timeData, format24h) {
  const hours = format24h ? timeData.hour : (timeData.hour % 12 || 12);
  const minutes = timeData.minute.toString().padStart(2, '0');
  const seconds = timeData.seconds.toString().padStart(2, '0');
  const ampm = !format24h ? (timeData.hour >= 12 ? ' PM' : ' AM') : '';
  return `${hours}:${minutes}:${seconds}${ampm}`;
}

function formatDate(timeData) {
  const date = new Date(
    timeData.year,
    timeData.month - 1,
    timeData.day
  );
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return date.toLocaleDateString('fr-FR', options);
}

function createClock() {
  // Injecter le CSS
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  // Créer l'interface de l'horloge
  const container = document.createElement('div');
  container.id = 'world-clock-container';
  container.className = settings.theme;
  
  const timeDiv = document.createElement('div');
  timeDiv.id = 'clock-time';
  
  const dateDiv = document.createElement('div');
  dateDiv.id = 'clock-date';
  
  const timezoneDiv = document.createElement('div');
  timezoneDiv.id = 'clock-timezone';
  timezoneDiv.textContent = 'Europe/Paris';
  
  const syncStatus = document.createElement('div');
  syncStatus.id = 'sync-status';
  
  container.appendChild(timeDiv);
  container.appendChild(dateDiv);
  container.appendChild(timezoneDiv);
  container.appendChild(syncStatus);
  
  document.body.appendChild(container);
  updateClock();
}

async function updateClock() {
  const clockDiv = document.getElementById('clock-time');
  const dateDiv = document.getElementById('clock-date');
  const statusDiv = document.getElementById('sync-status');
  
  if (!clockDiv) return;
  
  const timeData = await fetchTime();
  if (timeData) {
    clockDiv.textContent = formatTime(timeData, settings.format24h);
    dateDiv.textContent = formatDate(timeData);
    statusDiv.textContent = 'Synchronisé';
    
    const container = document.getElementById('world-clock-container');
    container.className = settings.theme;
  }
}

// Initialisation de la popup
function initializePopup() {
  // Charger les paramètres
  browser.storage.local.get(['theme', 'format24h']).then((result) => {
    if (result.theme) document.getElementById('theme').value = result.theme;
    if (result.format24h !== undefined) document.getElementById('format24h').value = result.format24h;
  });

  // Sauvegarder les paramètres
  document.getElementById('save').addEventListener('click', () => {
    const newSettings = {
      theme: document.getElementById('theme').value,
      format24h: document.getElementById('format24h').value === 'true'
    };
    
    browser.storage.local.set(newSettings).then(() => {
      browser.tabs.query({active: true, currentWindow: true}).then((tabs) => {
        browser.tabs.sendMessage(tabs[0].id, {
          action: 'updateSettings',
          settings: newSettings
        });
      });
    });
  });
}

// Initialisation de l'extension
if (document.body) {  // Content script
  browser.storage.local.get(['theme', 'format24h']).then((result) => {
    settings = { ...settings, ...result };
    createClock();
    setInterval(updateClock, 1000);
    setInterval(updateClock, 60000);
  });

  browser.runtime.onMessage.addListener((message) => {
    if (message.action === 'updateSettings') {
      settings = { ...settings, ...message.settings };
      const container = document.getElementById('world-clock-container');
      if (container) container.className = settings.theme;
    }
  });
}