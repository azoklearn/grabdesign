(() => {
  if (document.body.classList.contains('legal-page')) {
    const legalStyles = document.createElement('link');
    legalStyles.rel = 'stylesheet';
    legalStyles.href = 'legal.css';
    document.head.append(legalStyles);
  }

  const config = window.GRAB_DESIGN_CONFIG || {};
  const isConfigured = /^https:\/\/chromewebstore\.google\.com\/detail\//.test(config.chromeWebStoreUrl || '') && !/REPLACE/.test(config.chromeWebStoreUrl);

  document.querySelectorAll('[src^="../assets/"], [href^="../assets/"]').forEach((node) => {
    const attribute = node.hasAttribute('src') ? 'src' : 'href';
    node.setAttribute(attribute, node.getAttribute(attribute).replace('../assets/', 'assets/'));
  });

  document.querySelectorAll('[data-price]').forEach((node) => {
    node.textContent = config.launchPrice || '29 €';
  });

  document.querySelectorAll('[data-regular-price]').forEach((node) => {
    node.textContent = config.regularPrice || '49 €';
  });

  document.querySelectorAll('[data-launch-offer]').forEach((node) => {
    node.textContent = config.launchOffer || 'Tarif de lancement · 100 premières places';
  });

  const countdowns = document.querySelectorAll('.vbg-count');
  if (countdowns.length) {
    const duration = Math.max(0, Number(config.launchCountdownSeconds) || 13204);
    const storageKey = `grab-design-countdown-${duration}`;
    let deadline = 0;

    try {
      deadline = Number(sessionStorage.getItem(storageKey)) || 0;
      if (deadline <= Date.now()) {
        deadline = Date.now() + duration * 1000;
        sessionStorage.setItem(storageKey, String(deadline));
      }
    } catch {
      deadline = Date.now() + duration * 1000;
    }

    let countdownTimer;
    const updateCountdown = () => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      const hours = String(Math.floor(seconds / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
      const remainingSeconds = String(seconds % 60).padStart(2, '0');
      countdowns.forEach((node) => {
        node.textContent = `${hours}:${minutes}:${remainingSeconds}`;
      });
      if (seconds === 0 && countdownTimer) clearInterval(countdownTimer);
    };

    updateCountdown();
    countdownTimer = setInterval(updateCountdown, 1000);
  }

  document.querySelectorAll('.pricing-bg, .pricing-card-video video').forEach((video) => {
    video.muted = true;
    video.play().catch(() => {});
  });

  document.querySelectorAll('[data-dismiss-banner]').forEach((button) => {
    button.addEventListener('click', () => {
      button.closest('.vbg-banner').remove();
    });
  });

  document.querySelectorAll('.js-install').forEach((link) => {
    if (isConfigured) {
      link.href = config.chromeWebStoreUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      return;
    }
    link.href = '#prix';
    link.addEventListener('click', (event) => {
      if (link.closest('#prix')) return;
      event.preventDefault();
      document.querySelector('#prix').scrollIntoView({ behavior: 'smooth' });
    });
  });

  document.querySelectorAll('[data-support]').forEach((link) => {
    const email = config.supportEmail || 'hello@grabdesign.app';
    link.href = `mailto:${email}`;
    link.textContent = 'Support';
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((node) => observer.observe(node));
})();
