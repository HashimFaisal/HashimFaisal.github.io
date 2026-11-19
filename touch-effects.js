(() => {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layer = document.createElement('div');
  layer.className = 'nuvio-touch-layer';
  layer.setAttribute('aria-hidden', 'true');
  const water = document.createElement('div');
  water.className = 'nuvio-pull-water';
  water.setAttribute('aria-hidden', 'true');
  document.body.append(layer, water);

  let lastRippleAt = 0;
  const makeRipple = (x, y, size = 42) => {
    if (reducedMotion) return;
    const now = performance.now();
    if (now - lastRippleAt < 42) return;
    lastRippleAt = now;
    const ripple = document.createElement('span');
    ripple.className = 'nuvio-touch-ripple';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.style.setProperty('--ripple-size', size + 'px');
    layer.append(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  };

  document.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (event.target.closest('input, textarea, select, video, audio, [contenteditable="true"]')) return;
    makeRipple(event.clientX, event.clientY, event.pointerType === 'touch' ? 54 : 42);
  }, { passive: true });

  let startY = 0;
  let pulling = false;
  document.addEventListener('touchstart', event => {
    if (event.touches.length !== 1 || window.scrollY > 2) return;
    startY = event.touches[0].clientY;
    pulling = startY < 100;
  }, { passive: true });

  document.addEventListener('touchmove', event => {
    if (!pulling || !event.touches.length || window.scrollY > 2) return;
    const distance = Math.max(0, Math.min(112, event.touches[0].clientY - startY));
    if (distance < 5) return;
    water.style.setProperty('--pull-strength', String(.22 + distance / 112 * .9));
    water.classList.add('is-pulling');
    water.classList.remove('is-releasing');
    if (distance > 16) makeRipple(window.innerWidth / 2, Math.min(70, distance * .42), 64);
  }, { passive: true });

  const releaseWater = () => {
    if (!pulling) return;
    pulling = false;
    water.classList.remove('is-pulling');
    water.classList.add('is-releasing');
    window.setTimeout(() => water.classList.remove('is-releasing'), 260);
  };
  document.addEventListener('touchend', releaseWater, { passive: true });
  document.addEventListener('touchcancel', releaseWater, { passive: true });
})();
