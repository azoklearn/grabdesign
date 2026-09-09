const startButton = document.querySelector('#startCapture');
const status = document.querySelector('#status');

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle('error', isError);
}

startButton.addEventListener('click', async () => {
  startButton.disabled = true;
  setStatus('Activation du sélecteur…');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:/i.test(tab.url || '')) {
      throw new Error('Ouvrez une page web classique (http ou https).');
    }

    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    await chrome.tabs.sendMessage(tab.id, { type: 'GRABDESIGN_START' });
    setStatus('Sélecteur actif dans l’onglet.');
    window.close();
  } catch (error) {
    setStatus(error.message || 'Impossible d’activer le sélecteur.', true);
    startButton.disabled = false;
  }
});
