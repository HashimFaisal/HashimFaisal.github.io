/* NUVIO — Independent Live Updates module */
(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);

  let liveUpdatesTickerResizeObserver = null;
  let liveUpdatesTickerResizeFallbackAttached = false;

  function syncLiveUpdatesTicker() {
    const track = $('#live-updates-track');
    const content = $('#live-updates-content');
    if (!track || !content) return;

    const viewport = track.parentElement;
    if (!viewport) return;

    if (!liveUpdatesTickerResizeObserver &&
        typeof ResizeObserver !== 'undefined') {
      liveUpdatesTickerResizeObserver = new ResizeObserver(() => {
        syncLiveUpdatesTicker();
      });
      liveUpdatesTickerResizeObserver.observe(viewport);
    } else if (!liveUpdatesTickerResizeObserver &&
               !liveUpdatesTickerResizeFallbackAttached) {
      window.addEventListener('resize', syncLiveUpdatesTicker, {
        passive: true
      });
      liveUpdatesTickerResizeFallbackAttached = true;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      track.style.animation = 'none';

      Array.from(track.children)
        .filter(child => child.dataset.liveUpdatesClone === 'true')
        .forEach(child => child.remove());

      track.style.removeProperty('--live-updates-shift');
      track.style.removeProperty('--live-updates-duration');
      track.style.animation = '';
      return;
    }

    const width = content.getBoundingClientRect().width;
    const styles = window.getComputedStyle(content);
    const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 0;
    const distance = width + gap;
    const viewportWidth = viewport.clientWidth;

    if (!(distance > 0) || !viewportWidth) {
      return;
    }

    track.style.animation = 'none';

    Array.from(track.children)
      .filter(child => child.dataset.liveUpdatesClone === 'true')
      .forEach(child => child.remove());

    const copyCount = Math.max(
      2,
      Math.ceil(viewportWidth / distance) + 1
    );

    for (let i = 1; i < copyCount; i++) {
      const clone = content.cloneNode(true);

      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach(node => {
        node.removeAttribute('id');
      });

      clone.dataset.liveUpdatesClone = 'true';
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    }

    const speed = 42;
    const duration = distance / speed;

    track.style.setProperty(
      '--live-updates-shift',
      `${-distance}px`
    );

    track.style.setProperty(
      '--live-updates-duration',
      `${duration}s`
    );

    void track.offsetWidth;
    track.style.animation = '';
  }

  let liveUpdatesRequestId = 0;
  let liveUpdatesExpiryTimer = null;

  async function loadLiveUpdates() {
    clearTimeout(liveUpdatesExpiryTimer);
    liveUpdatesExpiryTimer = null;

    const requestId = ++liveUpdatesRequestId;
    const label = $('#live-updates-label');
    const content = $('#live-updates-content');
    const link = $('#live-updates-link');

    if (!label || !content || !link) return;

    const isArabic = false;

    function showWelcome() {
      if (requestId !== liveUpdatesRequestId) return;

      label.textContent = isArabic ? 'رسالة ترحيبية' : 'WELCOME';

      const welcome = document.createElement('strong');
      welcome.textContent = isArabic
        ? 'اكتشف عالم الإضافات وابقَ على اطلاع بكل جديد ✨'
        : 'Discover the world of add-ons and stay updated with everything new.';

      content.replaceChildren(welcome);
      link.hidden = true;
      link.removeAttribute('href');
      syncLiveUpdatesTicker();
    }

    try {
      const response = await fetch(
        `data/updates.json?t=${Date.now()}`,
        { cache: 'no-store' }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (requestId !== liveUpdatesRequestId) return;

      const now = Date.now();
      const language = isArabic ? 'ar' : 'en';

      const active = (Array.isArray(data) ? data : [])
        .filter(item => {
          if (!item || typeof item !== 'object') return false;

          const expiry = Date.parse(item.expiresAt);
          const published = Date.parse(item.publishedAt);
          const title = item.title?.[language];
          const description = item.description?.[language];

          return Number.isFinite(expiry) &&
            Number.isFinite(published) &&
            expiry > now &&
            published <= now &&
            typeof title === 'string' && title.trim() &&
            typeof description === 'string' && description.trim();
        })
        .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

      if (!active.length) {
        showWelcome();
        return;
      }

      const nextExpiry = Math.min(
        ...active.map(item => Date.parse(item.expiresAt))
      );

      liveUpdatesExpiryTimer = setTimeout(
        () => loadLiveUpdates(),
        Math.max(1000, nextExpiry - now + 1000)
      );

      const items = [];

      active.forEach((update, index) => {
        if (index > 0) {
          const separator = document.createElement('span');
          separator.textContent = '  ✦  ';
          items.push(separator);
        }

        const title = document.createElement('strong');
        title.textContent = update.title[language];

        const description = document.createElement('span');
        description.textContent = update.description[language];

        items.push(title, description);
      });

      label.textContent = isArabic ? 'مباشر' : 'LIVE';
      content.replaceChildren(...items);

      link.hidden = true;
      link.removeAttribute('href');

      syncLiveUpdatesTicker();
    } catch (error) {
      showWelcome();
      console.warn('Live updates could not be loaded:', error);
    }
  }

  function initLiveUpdates() {
    loadLiveUpdates();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLiveUpdates, { once: true });
  } else {
    initLiveUpdates();
  }
})();
