(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const main = document.querySelector('main');
  const hero = $('.hero');
  const liveUpdates = $('#live-updates');
  const stats = $('#status');
  const plugins = $('#plugins');
  const downloads = $('#downloads');
  const changelog = $('#changelog');
  const resources = $('.about');

  if (!main || !hero || !stats || !plugins || !downloads || !changelog || !resources) {
    console.error('Nuvio premium UI: required sections are missing.');
    return;
  }

  resources.id = 'resources';

  const views = {
    plugins,
    downloads,
    status: stats,
    changelog,
    resources
  };

  const labels = {
    ar: {
      eyebrow: 'NUVIO CONTROL CENTER',
      title: 'مساحة عملك الرقمية',
      subtitle: 'كل أدوات Nuvio ومصادره في تجربة واحدة منظمة.',
      dashboardTitle: 'مركز التحكم',
      dashboardSubtitle: 'اختَر القسم الذي تريد الوصول إليه، وكل أدواتك أمامك بوضوح.',
      dashboardMark: '05 أقسام',
      back: 'العودة إلى الرئيسية',
      open: 'استكشف القسم',
      plugins: ['مكتبة الإضافات', 'اكتشف الإضافات، ابحث بينها، وافتح روابط Manifest أو انسخها مباشرة.', 'ADD-ON LIBRARY'],
      downloads: ['مركز التنزيلات', 'تابع أحدث إصدار واطّلع على الملفات المتاحة وروابط التنزيل.', 'RELEASE CENTER'],
      status: ['حالة النظام', 'راقب نتائج الفحص ومصادر الإضافات وتحديثات الخدمات.', 'LIVE SYSTEM STATUS'],
      changelog: ['سجل التغييرات', 'تابع آخر التحديثات والتغييرات المسجلة في المنصة.', 'DEVELOPMENT HISTORY'],
      resources: ['مصادر المطوّرين', 'روابط المشاريع والمستودعات والمصادر الرسمية.', 'DEVELOPER RESOURCES']
    },
    en: {
      eyebrow: 'NUVIO CONTROL CENTER',
      title: 'Your digital workspace',
      subtitle: 'All Nuvio tools and resources in one organized experience.',
      dashboardTitle: 'Control Center',
      dashboardSubtitle: 'Choose a destination and reach every tool from one clear workspace.',
      dashboardMark: '05 SECTIONS',
      back: 'Back to dashboard',
      open: 'Explore section',
      plugins: ['Add-on Library', 'Discover add-ons, search the collection, and open or copy manifest links.', 'ADD-ON LIBRARY'],
      downloads: ['Download Center', 'Explore the latest release, available files, and download links.', 'RELEASE CENTER'],
      status: ['System Status', 'Monitor health checks, add-on sources, and service updates.', 'LIVE SYSTEM STATUS'],
      changelog: ['Changelog', 'Follow the latest updates and recorded platform changes.', 'DEVELOPMENT HISTORY'],
      resources: ['Developer Resources', 'Explore official projects, repositories, and useful resources.', 'DEVELOPER RESOURCES']
    }
  };

  const icon = {
    plugins: '◈',
    downloads: '↓',
    status: '⌁',
    changelog: '◷',
    resources: '⌘'
  };

  const dashboard = document.createElement('section');
  dashboard.id = 'nuvio-dashboard';
  dashboard.className = 'nuvio-dashboard';
  dashboard.innerHTML = `
    <div class="nuvio-dashboard-heading">
      <div>
        <span class="nuvio-kicker" id="nuvio-dashboard-kicker"></span>
        <h2 id="nuvio-dashboard-title"></h2>
        <p id="nuvio-dashboard-subtitle"></p>
      </div>
      <span class="nuvio-dashboard-mark" id="nuvio-dashboard-mark"></span>
    </div>
    <div class="nuvio-launch-grid" id="nuvio-launch-grid"></div>
  `;
  hero.after(dashboard);
  if (liveUpdates) hero.after(liveUpdates);

  function language() {
    return document.documentElement.lang === 'en' ? 'en' : 'ar';
  }

  function renderDashboard() {
    const lang = language();
    const copy = labels[lang];

    $('#nuvio-dashboard-kicker').textContent = copy.eyebrow;
    $('#nuvio-dashboard-title').textContent = copy.dashboardTitle;
    $('#nuvio-dashboard-subtitle').textContent = copy.dashboardSubtitle;
    $('#nuvio-dashboard-mark').textContent = copy.dashboardMark;

    $('#nuvio-launch-grid').innerHTML = Object.entries(views).map(([id]) => {
      const item = copy[id];
      return `
        <a class="nuvio-launch-card" href="#${id}" data-view="${id}">
          <img class="nuvio-launch-art" src="assets/dashboard-${id}.svg" alt="" aria-hidden="true" loading="lazy" decoding="async">
          <span class="nuvio-launch-code">${item[2]}</span>
          <strong>${item[0]}</strong>
          <span class="nuvio-launch-description">${item[1]}</span>
          <span class="nuvio-launch-open">${copy.open}<b aria-hidden="true">↗</b></span>
        </a>`;
    }).join('');
  }

  let scrollSaveFrame = 0;

  function currentView() {
    return document.body.dataset.nuvioView || 'home';
  }

  function renderView(target) {
    const home = target === 'home';

    hero.hidden = !home;
    if (liveUpdates) {
      liveUpdates.hidden = false;
      liveUpdates.classList.toggle('live-updates--background', !home);
      liveUpdates.inert = !home;
    }
    dashboard.hidden = !home;
    stats.hidden = !home && target !== 'status';

    Object.entries(views).forEach(([key, section]) => {
      section.hidden = home || key !== target;
      section.classList.toggle('nuvio-view-active', !home && key === target);
    });

    $$('.nuvio-view-back .nuvio-back-label').forEach(node => {
      node.textContent = labels[language()].back;
    });

    $$('.topbar nav a').forEach(link => {
      const active = !home && link.hash === `#${target}`;
      link.classList.toggle('nuvio-nav-active', active);

      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    document.body.dataset.nuvioView = target;
  }

  function focusView(target) {
    const section = target === 'home' ? hero : views[target];
    if (!section) return;

    const heading = target === 'home'
      ? section.querySelector('h1')
      : (section.querySelector('h1, h2, h3') || section);

    if (!heading.hasAttribute('tabindex')) {
      heading.setAttribute('tabindex', '-1');
    }

    try {
      heading.focus({ preventScroll: true });
    } catch {
      heading.focus();
    }
  }

  function restoreScroll(position = 0) {
    const html = document.documentElement;
    const previousBehavior = html.style.scrollBehavior;

    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, Math.max(0, Number(position) || 0));

    requestAnimationFrame(() => {
      html.style.scrollBehavior = previousBehavior;
    });
  }

  function saveCurrentEntry() {
    const state = history.state || {};

    history.replaceState({
      ...state,
      nuvioApp: true,
      nuvioView: currentView(),
      nuvioScrollY: window.scrollY,
      nuvioIndex: Number(state.nuvioIndex) || 0
    }, '', location.href);
  }

  function navigate(target, options = {}) {
    if (target !== 'home' && !views[target]) return;
    if (target === currentView()) return;

    saveCurrentEntry();

    let index = Number(history.state?.nuvioIndex) || 0;

    // Changelog destinations get an explicit return entry. This guarantees
    // Back restores the exact originating list and its scroll position,
    // even when the changelog was opened from a direct URL or an older entry.
    if (options.preserveOrigin) {
      const originView = currentView();
      history.pushState({
        ...(history.state || {}),
        nuvioApp: true,
        nuvioView: originView,
        nuvioScrollY: window.scrollY,
        nuvioIndex: index + 1
      }, '', `#${originView}`);
      index += 1;
    }

    history.pushState({
      nuvioApp: true,
      nuvioView: target,
      nuvioScrollY: 0,
      nuvioIndex: index + 1
    }, '', `#${target}`);

    renderView(target);
    focusView(target);
    restoreScroll(0);
  }

  function goBack() {
    if (currentView() === 'home') return;

    const state = history.state || {};
    const index = Number(state.nuvioIndex) || 0;

    // Return to the actual previous history entry so its saved view and
    // scroll position (including the originating card) are restored by popstate.
    if (state.nuvioApp && index > 0) {
      history.back();
      return;
    }

    // A section opened directly has no in-app entry to return to.
    renderView('home');
    focusView('home');
    restoreScroll(0);
  }

  function addBackButton(section) {
    if (section.querySelector('.nuvio-view-back')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nuvio-view-back';
    button.innerHTML = '<span aria-hidden="true">←</span><span class="nuvio-back-label"></span>';
    button.addEventListener('click', goBack);
    section.prepend(button);
  }

  Object.values(views).forEach(addBackButton);

  renderDashboard();

  history.scrollRestoration = 'manual';

  const initialHash = location.hash.slice(1);
  const initialView = views[initialHash] ? initialHash : 'home';
  const initialState = history.state || {};
  const initialScroll = initialState.nuvioApp &&
    initialState.nuvioView === initialView
      ? initialState.nuvioScrollY
      : window.scrollY;

  history.replaceState({
    ...initialState,
    nuvioApp: true,
    nuvioView: initialView,
    nuvioScrollY: initialScroll,
    nuvioIndex: Number(initialState.nuvioIndex) || 0
  }, '', location.href);

  renderView(initialView);
  restoreScroll(initialScroll);

  document.addEventListener('click', event => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return;

    const link = event.target.closest('a[href^="#"]');
    if (
      !link ||
      (link.target && link.target !== '_self') ||
      link.hasAttribute('download')
    ) return;

    const id = link.getAttribute('href').slice(1);

    if (!id || id === 'home' || views[id]) {
      event.preventDefault();
      navigate(id && views[id] ? id : 'home');
    }
  });

  document.addEventListener('nuvio:open-changelog-target', event => {
    const sectionName = event.detail?.section;
    const name = String(event.detail?.name || '').trim();
    const targetUrl = String(event.detail?.url || '').trim();
    if (!['plugins', 'downloads'].includes(sectionName)) return;

    const section = views[sectionName];
    const cards = sectionName === 'plugins'
      ? [...section.querySelectorAll('.plugin-card')]
      : [...section.querySelectorAll('.downloads-device-card, .release-asset-card, .enhanced-latest-release')];
    const normalizeName = value => String(value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
    let card = cards.find(item =>
      normalizeName(item.querySelector('h3')?.textContent) === normalizeName(name)
    );

    if (!card && targetUrl) {
      const project = (() => {
        try {
          const url = new URL(targetUrl);
          if (url.hostname.toLowerCase() !== 'github.com') return '';
          const parts = url.pathname.split('/').filter(Boolean);
          return parts.length >= 2 ? `${parts[0].toLowerCase()}/${parts[1].toLowerCase()}` : '';
        } catch { return ''; }
      })();
      card = cards.find(item => {
        const manifest = item.querySelector('.manifest-url')?.textContent.trim();
        if (manifest === targetUrl) return true;
        return [...item.querySelectorAll('a[href]')].some(link => {
          if (link.href === targetUrl) return true;
          if (!project) return false;
          try {
            const url = new URL(link.href);
            const parts = url.pathname.split('/').filter(Boolean);
            return url.hostname.toLowerCase() === 'github.com' &&
              parts.length >= 2 &&
              `${parts[0].toLowerCase()}/${parts[1].toLowerCase()}` === project;
          } catch { return false; }
        });
      });
    }
    if (!card) return;

    navigate(sectionName, { preserveOrigin: true });
    requestAnimationFrame(() => {
      if (sectionName === 'downloads') {
        const deviceGroup = card.closest('.downloads-device-section');
        if (deviceGroup?.dataset.deviceGroup) {
          document.querySelectorAll('#downloads .downloads-device-section').forEach(group => {
            group.hidden = group !== deviceGroup;
          });
          document.querySelectorAll('#downloads-device-nav [data-download-device]').forEach(button => {
            const active = button.dataset.downloadDevice === deviceGroup.dataset.deviceGroup;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
          });
        }
      }
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('changelog-target-highlight');
      card.setAttribute('tabindex', '-1');
      try {
        card.focus({ preventScroll: true });
      } catch {
        card.focus();
      }
      window.setTimeout(() => card.classList.remove('changelog-target-highlight'), 2400);
    });
  });

  window.addEventListener('popstate', event => {
    const state = event.state || {};
    const hash = location.hash.slice(1);
    const target = views[state.nuvioView]
      ? state.nuvioView
      : (views[hash] ? hash : 'home');

    renderView(target);
    focusView(target);
    restoreScroll(state.nuvioScrollY || 0);
  });

  window.addEventListener('scroll', () => {
    if (scrollSaveFrame) return;

    scrollSaveFrame = requestAnimationFrame(() => {
      scrollSaveFrame = 0;
      saveCurrentEntry();
    });
  }, { passive: true });

  $('#language-toggle')?.addEventListener('click', () => {
    requestAnimationFrame(() => {
      dashboard.classList.remove('nuvio-language-switching');
      void dashboard.offsetWidth;
      dashboard.classList.add('nuvio-language-switching');
      renderDashboard();
      $$('.nuvio-view-back .nuvio-back-label').forEach(node => {
        node.textContent = labels[language()].back;
      });
      window.setTimeout(() => {
        dashboard.classList.remove('nuvio-language-switching');
      }, 650);
    });
  });

})();
