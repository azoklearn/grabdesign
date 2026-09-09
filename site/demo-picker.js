(() => {
  const UI_ATTRIBUTE = 'data-grabdesign-demo-ui';
  const MAX_NODES = 120;
  const SKIPPED_TAGS = new Set(['SCRIPT', 'NOSCRIPT', 'STYLE', 'TEMPLATE']);
  const STYLE_PROPERTIES = [
    'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'overflow', 'box-sizing',
    'width', 'height', 'max-width', 'margin', 'padding', 'border', 'border-radius', 'background',
    'background-color', 'color', 'font-family', 'font-size', 'font-weight', 'line-height',
    'letter-spacing', 'text-align', 'text-transform', 'white-space', 'box-shadow', 'transform',
    'flex', 'flex-direction', 'flex-wrap', 'align-items', 'justify-content', 'gap', 'object-fit'
  ];

  class DemoPicker {
    constructor() {
      this.active = false;
      this.current = null;
      this.outline = null;
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
      document.documentElement.classList.add('grabdesign-demo-selecting');
      this.showToast('Mode démo activé : survolez un élément, puis cliquez pour copier son code. Esc pour annuler.', 'hint');
    }

    stop() {
      if (!this.active) return;
      this.active = false;
      this.current = null;
      document.removeEventListener('pointermove', this.onMove, true);
      document.removeEventListener('click', this.onClick, true);
      document.removeEventListener('keydown', this.onKeydown, true);
      document.documentElement.classList.remove('grabdesign-demo-selecting');
      this.outline?.remove();
      this.label?.remove();
      this.style?.remove();
      this.outline = this.label = this.style = null;
    }

    mountUI() {
      this.style = document.createElement('style');
      this.style.setAttribute(UI_ATTRIBUTE, '');
      this.style.textContent = `
        .grabdesign-demo-selecting, .grabdesign-demo-selecting * { cursor: crosshair !important; }
        [${UI_ATTRIBUTE}] { box-sizing: border-box !important; font-family: ui-monospace, SFMono-Regular, Menlo, monospace !important; pointer-events: none !important; position: fixed !important; z-index: 2147483647 !important; }
        .grabdesign-demo-outline { border: 2px solid #fff !important; background: rgba(255,255,255,.14) !important; box-shadow: 0 0 0 1px #e64b22, 0 10px 28px rgba(0,0,0,.42) !important; }
        .grabdesign-demo-label { max-width: min(310px, calc(100vw - 16px)); padding: 7px 9px; border: 1px solid #fff; border-radius: 5px; background: #111; color: #fff; font-size: 11px !important; line-height: 1.2 !important; letter-spacing: .01em !important; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .grabdesign-demo-toast { left: 50%; bottom: 24px; max-width: min(580px, calc(100vw - 32px)); padding: 11px 14px; border: 1px solid #e64b22; border-radius: 8px; background: #111; color: #fff; box-shadow: 0 14px 42px rgba(0,0,0,.45); font-size: 12px !important; line-height: 1.4 !important; text-align: center; transform: translateX(-50%); transition: opacity .2s ease, transform .2s ease; }
        .grabdesign-demo-toast.hint { border-color: #fff; }
        .grabdesign-demo-toast.error { border-color: #ff8e6e; color: #ffb59f; }
      `;
      document.documentElement.append(this.style);

      this.outline = document.createElement('div');
      this.outline.className = 'grabdesign-demo-outline';
      this.outline.setAttribute(UI_ATTRIBUTE, '');
      this.label = document.createElement('div');
      this.label.className = 'grabdesign-demo-label';
      this.label.setAttribute(UI_ATTRIBUTE, '');
      document.documentElement.append(this.outline, this.label);
    }

    onMove(event) {
      const target = this.pickElement(event.clientX, event.clientY);
      if (!target || target === this.current) return;
      this.current = target;
      const rect = target.getBoundingClientRect();
      Object.assign(this.outline.style, {
        top: `${Math.max(0, rect.top)}px`, left: `${Math.max(0, rect.left)}px`,
        width: `${Math.max(0, rect.width)}px`, height: `${Math.max(0, rect.height)}px`
      });
      this.label.textContent = this.describe(target);
      Object.assign(this.label.style, {
        top: `${Math.max(6, rect.top > 36 ? rect.top - 34 : rect.bottom + 8)}px`,
        left: `${Math.max(6, rect.left)}px`
      });
    }

    async onClick(event) {
      const target = this.pickElement(event.clientX, event.clientY) || this.current;
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      this.stop();
      this.showToast('Préparation du HTML et des styles…', 'hint');
      try {
        const result = this.buildExport(target);
        await this.copy(result.document);
        this.showToast(`Copié : ${result.nodeCount} calques. Collez-le dans Claude, Cursor, Lovable ou Gemini.`, 'success');
      } catch (error) {
        this.showToast(error.message || 'La copie a échoué. Réessayez dans un onglet HTTPS.', 'error');
      }
    }

    onKeydown(event) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
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

    describe(element) {
      const id = element.id ? `#${element.id}` : '';
      const classes = [...element.classList].slice(0, 2).map((name) => `.${name}`).join('');
      const rect = element.getBoundingClientRect();
      return `${element.tagName.toLowerCase()}${id}${classes} · ${Math.round(rect.width)} × ${Math.round(rect.height)}`;
    }

    buildExport(root) {
      const clone = root.cloneNode(true);
      this.sanitiseClone(clone);
      const originals = this.exportableElements(root);
      const copies = this.exportableElements(clone);
      const count = Math.min(originals.length, copies.length, MAX_NODES);

      for (let index = 0; index < count; index += 1) {
        copies[index].setAttribute('style', this.serialiseStyle(getComputedStyle(originals[index])));
      }

      this.absolutizeResources(clone);
      return { document: clone.outerHTML, nodeCount: count };
    }

    exportableElements(root) {
      return [root, ...root.querySelectorAll('*')].filter((element) => !SKIPPED_TAGS.has(element.tagName));
    }

    sanitiseClone(root) {
      [root, ...root.querySelectorAll('*')].forEach((element) => {
        if (SKIPPED_TAGS.has(element.tagName)) element.remove();
        [...element.attributes].forEach((attribute) => {
          if (/^on/i.test(attribute.name)) element.removeAttribute(attribute.name);
        });
      });
    }

    serialiseStyle(style) {
      return STYLE_PROPERTIES.map((name) => {
        const value = style.getPropertyValue(name);
        return value ? `${name}: ${this.absolutizeCssUrls(value)}` : '';
      }).filter(Boolean).join('; ');
    }

    absolutizeResources(root) {
      [root, ...root.querySelectorAll('*')].forEach((element) => {
        ['src', 'href', 'poster', 'action', 'formaction'].forEach((name) => {
          if (element.hasAttribute(name)) element.setAttribute(name, this.absolutizeUrl(element.getAttribute(name)));
        });
        if (element.hasAttribute('style')) element.setAttribute('style', this.absolutizeCssUrls(element.getAttribute('style')));
      });
    }

    absolutizeUrl(value) {
      if (!value || /^(?:[a-z][a-z\d+.-]*:|#|\/\/)/i.test(value)) return value;
      try { return new URL(value, location.href).href; } catch (_) { return value; }
    }

    absolutizeCssUrls(value) {
      return value.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (_match, quote, url) => `url(${quote}${this.absolutizeUrl(url)}${quote})`);
    }

    async copy(text) {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
      document.body.append(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      if (!copied) throw new Error('Votre navigateur a refusé la copie.');
    }

    showToast(message, tone) {
      document.querySelectorAll(`[${UI_ATTRIBUTE}].grabdesign-demo-toast`).forEach((node) => node.remove());
      const toast = document.createElement('div');
      toast.className = `grabdesign-demo-toast ${tone}`;
      toast.setAttribute(UI_ATTRIBUTE, '');
      toast.textContent = message;
      document.documentElement.append(toast);
      window.setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(8px)';
        window.setTimeout(() => toast.remove(), 250);
      }, tone === 'error' ? 4800 : 3900);
    }
  }

  window.GrabDesignDemo = new DemoPicker();
})();
