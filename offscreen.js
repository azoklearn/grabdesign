chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'GRABDESIGN_OFFSCREEN_COPY') return;

  try {
    // An offscreen document deliberately cannot receive focus. Consequently,
    // navigator.clipboard.writeText() rejects with "Document is not focused".
    // execCommand is still supported in extension documents and does not have
    // that focus requirement.
    const textarea = document.createElement('textarea');
    textarea.value = message.text;
    textarea.setAttribute('aria-hidden', 'true');
    Object.assign(textarea.style, {
      position: 'fixed', left: '-9999px', top: '0', opacity: '0'
    });
    document.body.append(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const copied = document.execCommand('copy');
    textarea.remove();

    if (!copied) throw new Error('Chrome a refusé l’accès au presse-papiers.');
    sendResponse({ ok: true });
  } catch (error) {
    sendResponse({ ok: false, error: error.message });
  }
});
