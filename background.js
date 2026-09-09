let offscreenCreation;

async function ensureClipboardDocument() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (contexts.length) return;

  if (!offscreenCreation) {
    offscreenCreation = chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['CLIPBOARD'],
      justification: 'Copier le code HTML et CSS de l’élément sélectionné par l’utilisateur.'
    });
  }

  try {
    await offscreenCreation;
  } finally {
    offscreenCreation = null;
  }
}

async function copyToClipboard(text) {
  await ensureClipboardDocument();
  const response = await chrome.runtime.sendMessage({ type: 'GRABDESIGN_OFFSCREEN_COPY', text });
  if (!response?.ok) throw new Error(response?.error || 'La copie a échoué.');
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'GRABDESIGN_COPY') return;

  copyToClipboard(message.text)
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});
