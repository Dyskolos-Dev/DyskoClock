document.addEventListener('DOMContentLoaded', function() {
  // Charger les paramètres actuels
  chrome.storage.local.get(['theme', 'format24h', 'position'], function(result) {
    if (result.theme) document.getElementById('theme').value = result.theme;
    if (result.format24h !== undefined) document.getElementById('format24h').value = result.format24h.toString();
    if (result.position) document.getElementById('position').value = result.position;
  });

  // Sauvegarder les paramètres
  document.getElementById('save').addEventListener('click', function() {
    var newSettings = {
      theme: document.getElementById('theme').value,
      format24h: document.getElementById('format24h').value === 'true',
      position: document.getElementById('position').value
    };
    
    chrome.storage.local.set(newSettings, function() {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'updateSettings',
          settings: newSettings
        });
      });
    });
  });
});