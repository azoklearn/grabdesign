(() => {
  if (window.__grabDesignPicker) return;

  const UI_ATTRIBUTE = 'data-grabdesign-ui';
  const MAX_NODES = 220;
  const SKIPPED_TAGS = new Set(['SCRIPT', 'NOSCRIPT', 'STYLE', 'TEMPLATE']);
  // A compact subset deliberately mirrors the properties that affect the
  // visible layout. Copying Chrome's complete computed style object adds over
  // 600 browser-default declarations to every single node.
  const INLINE_STYLE_PROPERTIES = [
    'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'overflow', 'box-sizing',
    'width', 'height', 'max-width', 'margin', 'padding', 'border', 'border-radius', 'outline',
    'background', 'background-color', 'background-position', 'background-clip', 'color',
    'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-align',
    'text-transform', 'white-space', 'box-shadow', 'transform', 'transform-origin', 'flex',
    'flex-direction', 'flex-wrap', 'align-items', 'justify-content', 'gap', 'object-fit', 'cursor'
  ];
  const ALWAYS_INLINE_PROPERTIES = new Set([
    'box-sizing', 'border', 'outline', 'background', 'background-position', 'background-clip',
    'color', 'font-family', 'font-size', 'font-weight', 'line-height', 'transform-origin', 'flex',
    'flex-direction', 'flex-wrap', 'object-fit'
  ]);

  class DesignPicker {
    constructor() {
      this.active = false;
      this.current = null;
      this.overlay = null;
      this.label = null;
      this.style = null;
      this.onMove = this.onMove.bind(this);
      this.onClick = this.onClick.bind(this);
      this.onKeydown = this.onKeydown.bind(this);
    }

    start() {
      if (this.active) return;
      this.active = true;
      this.mountUI();
      document.addEventListener('pointermove', this.onMove, true);
      document.addEventListener('click', this.onClick, true);
      document.addEventListener('keydown', this.onKeydown, true);
      document.documentElement.classList.add('grabdesign-selecting');
      this.showToast('Survolez un élément, puis cliquez pour copier son code.  Esc pour annuler.', 'hint');
    }

    stop() {
      if (!this.active) return;
      this.active = false;
      this.current = null;
      document.removeEventListener('pointermove', this.onMove, true);
      document.removeEventListener('click', this.onClick, true);
      document.removeEventListener('keydown', this.onKeydown, true);
      document.documentElement.classList.remove('grabdesign-selecting');
      this.overlay?.remove();
      this.label?.remove();
      this.style?.remove();
      this.overlay = this.label = this.style = null;
    }

    mountUI() {
      this.style = document.createElement('style');
      this.style.setAttribute(UI_ATTRIBUTE, '');
      this.style.textContent = `
        .grabdesign-selecting, .grabdesign-selecting * { cursor: crosshair !important; }
        [${UI_ATTRIBUTE}] { all: initial; box-sizing: border-box; font-family: ui-monospace, SFMono-Regular, Menlo, monospace !important; pointer-events: none !important; position: fixed !important; z-index: 2147483647 !important; }
        .grabdesign-outline { border: 2px solid #c8ff5d !important; background: rgba(200,255,93,.12) !important; box-shadow: 0 0 0 1px #141411, 0 9px 25px rgba(0,0,0,.35) !important; }
        .grabdesign-label { max-width: 280px; padding: 6px 8px; border: 1px solid #c8ff5d; background: #171713; color: #f6f1e7; font-size: 11px !important; line-height: 1.2 !important; letter-spacing: .02em !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .grabdesign-toast { left: 50%; bottom: 24px; max-width: 550px; transform: translateX(-50%); padding: 10px 13px; border: 1px solid #c8ff5d; background: #171713; color: #f6f1e7; box-shadow: 0 12px 35px rgba(0,0,0,.35); font-size: 12px !important; line-height: 1.35 !important; transition: opacity .22s ease, transform .22s ease; }
        .grabdesign-toast.error { border-color: #ff8e6e; color: #ffb59f; }
        .grabdesign-toast.hint { color: #c8ff5d; }
      `;
      document.documentElement.append(this.style);

      this.overlay = document.createElement('div');
      this.overlay.className = 'grabdesign-outline';
      this.overlay.setAttribute(UI_ATTRIBUTE, '');
      this.label = document.createElement('div');
      this.label.className = 'grabdesign-label';
      this.label.setAttribute(UI_ATTRIBUTE, '');
      document.documentElement.append(this.overlay, this.label);
    }

    onMove(event) {
      const target = this.pickElement(event.clientX, event.clientY);
      if (!target || target === this.current) return;
      this.current = target;
      this.drawTarget(target);
    }

    onClick(event) {
      const target = this.pickElement(event.clientX, event.clientY) || this.current;
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      this.capture(target);
    }

    onKeydown(event) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      this.stop();
    }

    pickElement(x, y) {
      const element = document.elementFromPoint(x, y);
      if (!(element instanceof Element) || element.closest(`[${UI_ATTRIBUTE}]`)) return null;
      if (element === document.documentElement || element === document.body) {
        return [...document.body.children].find((child) => !child.hasAttribute(UI_ATTRIBUTE)) || null;
      }
      return element;
    }

    drawTarget(target) {
      const rect = target.getBoundingClientRect();
      Object.assign(this.overlay.style, {
        top: `${Math.max(0, rect.top)}px`, left: `${Math.max(0, rect.left)}px`,
        width: `${Math.max(0, rect.width)}px`, height: `${Math.max(0, rect.height)}px`
      });
      this.label.textContent = this.describe(target);
      const labelTop = rect.top > 32 ? rect.top - 30 : rect.bottom + 7;
      Object.assign(this.label.style, { top: `${Math.max(4, labelTop)}px`, left: `${Math.max(4, rect.left)}px` });
    }

    describe(element) {
      const id = element.id ? `#${element.id}` : '';
      const classes = [...element.classList].slice(0, 2).map((name) => `.${name}`).join('');
      return `${element.tagName.toLowerCase()}${id}${classes} · ${Math.round(element.getBoundingClientRect().width)} × ${Math.round(element.getBoundingClientRect().height)}`;
    }

    async capture(target) {
      this.stop();
      this.showToast('Préparation du HTML et des styles calculés…', 'hint');
      try {
        const result = buildExport(target);
        const response = await chrome.runtime.sendMessage({ type: 'GRABDESIGN_COPY', text: result.document });
        if (!response?.ok) throw new Error(response?.error || 'La copie a échoué.');
        this.showToast(`Copié : ${result.nodeCount} calques, ${formatBytes(result.document.length)}. Fragment HTML prêt à coller.`, 'success');
      } catch (error) {
        this.showToast(error.message || 'La capture a échoué.', 'error');
      }
    }

    showToast(message, tone = 'success') {
      document.querySelectorAll(`[${UI_ATTRIBUTE}].grabdesign-toast`).forEach((node) => node.remove());
      const toast = document.createElement('div');
      toast.className = `grabdesign-toast ${tone}`;
      toast.setAttribute(UI_ATTRIBUTE, '');
      toast.textContent = message;
      // `stop()` removes the picker stylesheet before this message is shown.
      // Keep the result visible without leaving any page-level styles behind.
      Object.assign(toast.style, {
        position: 'fixed', left: '50%', bottom: '24px', zIndex: '2147483647',
        maxWidth: 'min(550px, calc(100vw - 32px))', padding: '10px 13px',
        transform: 'translateX(-50%)', border: `1px solid ${tone === 'error' ? '#ff8e6e' : '#c8ff5d'}`,
        background: '#171713', color: tone === 'error' ? '#ffb59f' : tone === 'hint' ? '#c8ff5d' : '#f6f1e7',
        boxShadow: '0 12px 35px rgba(0,0,0,.35)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '12px', lineHeight: '1.35', pointerEvents: 'none', transition: 'opacity .22s ease, transform .22s ease'
      });
      document.documentElement.append(toast);
      window.setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(8px)';
        window.setTimeout(() => toast.remove(), 300);
      }, tone === 'error' ? 4800 : 3600);
    }
  }

  function buildExport(root) {
    const clone = root.cloneNode(true);
    sanitiseClone(clone);

    const originals = getExportableElements(root);
    const copies = getExportableElements(clone);
    const count = Math.min(originals.length, copies.length, MAX_NODES);
    const pseudoRules = [];

    for (let index = 0; index < count; index += 1) {
      const original = originals[index];
      const copy = copies[index];
      const computedStyle = serializeCompactStyle(getComputedStyle(original));
      copy.setAttribute('style', computedStyle);
      addPseudoRules(pseudoRules, original, copy, index);
      preserveCanvasFrame(original, copy);
      preserveFormState(original, copy);
    }

    absolutizeResources(clone);
    const pseudoStyle = pseudoRules.length ? `<style data-grabdesign-pseudos>${pseudoRules.join('')}</style>\n` : '';
    const fragment = `${pseudoStyle}${clone.outerHTML}`;
    return { document: fragment, nodeCount: count };
  }

  function getExportableElements(root) {
    return [root, ...root.querySelectorAll('*')].filter((element) => !SKIPPED_TAGS.has(element.tagName));
  }

  function sanitiseClone(root) {
    [root, ...root.querySelectorAll('*')].forEach((element) => {
      if (SKIPPED_TAGS.has(element.tagName)) element.remove();
      [...element.attributes].forEach((attribute) => {
        if (/^on/i.test(attribute.name)) element.removeAttribute(attribute.name);
      });
    });
  }

  function serializeCompactStyle(style) {
    const declarations = [];
    for (const name of INLINE_STYLE_PROPERTIES) {
      const value = style.getPropertyValue(name);
      if (value && shouldKeepProperty(name, value)) declarations.push(`${name}: ${absolutizeCssUrls(value)}`);
    }
    return declarations.join('; ');
  }

  function shouldKeepProperty(name, value) {
    if (ALWAYS_INLINE_PROPERTIES.has(name)) return true;
    const normalised = value.trim().toLowerCase();

    if (name === 'display') return normalised !== 'none';
    if (name === 'position') return normalised !== 'static';
    if (name === 'z-index') return normalised !== 'auto' && normalised !== '0' && normalised !== '1';
    if (name === 'width' || name === 'height') return normalised !== 'auto' && normalised !== '0px';
    if (name === 'padding' || name === 'margin' || name === 'border-radius') return !isZeroValue(normalised);
    if (name === 'overflow') return normalised !== 'visible';
    if (name === 'background-color') return !isTransparent(normalised);
    if (name === 'max-width') return normalised !== 'none';
    if (name === 'transform' || name === 'box-shadow') return normalised !== 'none';
    if (name === 'top' || name === 'right' || name === 'bottom' || name === 'left') return normalised !== 'auto' && !isZeroValue(normalised);
    if (name === 'cursor') return normalised !== 'auto';
    if (name === 'white-space') return normalised !== 'normal';
    if (name === 'gap') return normalised !== 'normal' && !isZeroValue(normalised);
    if (name === 'letter-spacing') return normalised !== 'normal';
    if (name === 'text-align') return normalised !== 'start';
    if (name === 'text-transform') return normalised !== 'none';
    if (name === 'align-items' || name === 'justify-content') return normalised !== 'normal';
    return true;
  }

  function isZeroValue(value) {
    return /^(?:0(?:\.0+)?(?:px|em|rem|%|vh|vw)?)(?:\s+0(?:\.0+)?(?:px|em|rem|%|vh|vw)?){0,3}$/.test(value);
  }

  function isTransparent(value) {
    return value === 'transparent' || /^rgba\([^)]*,\s*0\)$/.test(value);
  }

  function addPseudoRules(rules, element, copy, index) {
    for (const pseudo of ['::before', '::after']) {
      const style = getComputedStyle(element, pseudo);
      const content = style.getPropertyValue('content');
      if (!content || content === 'none' || content === 'normal') continue;
      const marker = `grabdesign-pseudo-${index}`;
      copy.setAttribute('data-grabdesign-pseudo', marker);
      rules.push(`[data-grabdesign-pseudo="${marker}"]${pseudo}{content:${content};${serializeCompactStyle(style)}}`);
    }
  }

  function absolutizeResources(root) {
    [root, ...root.querySelectorAll('*')].forEach((element) => {
      for (const name of ['src', 'href', 'poster', 'action', 'formaction', 'xlink:href']) {
        if (element.hasAttribute(name)) element.setAttribute(name, absolutizeUrl(element.getAttribute(name)));
      }
      if (element.hasAttribute('srcset')) element.setAttribute('srcset', absolutizeSrcset(element.getAttribute('srcset')));
      if (element.hasAttribute('style')) element.setAttribute('style', absolutizeCssUrls(element.getAttribute('style')));
    });
  }

  function absolutizeUrl(value) {
    if (!value || /^(?:[a-z][a-z\d+.-]*:|#|\/\/)/i.test(value)) return value;
    try {
      return new URL(value, location.href).href;
    } catch (_) {
      return value;
    }
  }

  function absolutizeSrcset(value) {
    return value.split(',').map((candidate) => {
      const [url, ...descriptor] = candidate.trim().split(/\s+/);
      return [absolutizeUrl(url), ...descriptor].join(' ');
    }).join(', ');
  }

  function absolutizeCssUrls(value) {
    return value.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (_match, quote, url) => `url(${quote}${absolutizeUrl(url)}${quote})`);
  }

  function preserveCanvasFrame(original, copy) {
    if (!(original instanceof HTMLCanvasElement) || !(copy instanceof HTMLCanvasElement)) return;
    try {
      const image = original.toDataURL();
      copy.style.backgroundImage = `url("${image}")`;
      copy.style.backgroundSize = '100% 100%';
    } catch (_) {
      // A canvas tainted by a third-party image cannot legally be serialized.
    }
  }

  function preserveFormState(original, copy) {
    if (original instanceof HTMLInputElement && copy instanceof HTMLInputElement) {
      copy.setAttribute('value', original.value);
      if (original.checked) copy.setAttribute('checked', '');
    }
    if (original instanceof HTMLTextAreaElement && copy instanceof HTMLTextAreaElement) copy.textContent = original.value;
    if (original instanceof HTMLSelectElement && copy instanceof HTMLSelectElement) {
      [...copy.options].forEach((option, index) => option.toggleAttribute('selected', original.options[index]?.selected));
    }
  }

  function formatBytes(bytes) {
    return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} Ko` : `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  }

  const picker = new DesignPicker();
  window.__grabDesignPicker = picker;
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'GRABDESIGN_START') picker.start();
  });
})();
