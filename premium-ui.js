(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const main = document.querySelector('main');
  const hero = $('.hero');
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
        <span class="nuvio-kicker" id="nuvio-kicker"></span>
        <h2 id="nuvio-dashboard-title"></h2>
        <p id="nuvio-dashboard-subtitle"></p>
      </div>
      <span class="nuvio-dashboard-mark">N / 01</span>
    </div>
    <div class="nuvio-overview" id="nuvio-overview">
      <article class="nuvio-overview-card">
        <span data-overview-label="health"></span>
        <strong data-overview-source="health-state">—</strong>
        <small>LIVE CHECK</small>
      </article>
      <article class="nuvio-overview-card">
        <span data-overview-label="addons"></span>
        <strong data-overview-source="addon-count">—</strong>
        <small>ADD-ON SOURCES</small>
      </article>
      <article class="nuvio-overview-card">
        <span data-overview-label="release"></span>
        <strong data-overview-source="release-version">—</strong>
        <small>NUVIO MOBILE</small>
      </article>
      <article class="nuvio-overview-card">
        <span data-overview-label="downloads"></span>
        <strong data-overview-source="download-count">—</strong>
        <small>RELEASE ASSETS</small>
      </article>
    </div>
    <div class="nuvio-launch-grid" id="nuvio-launch-grid"></div>
  `;
  hero.after(dashboard);

  function language() {
    return document.documentElement.lang === 'en' ? 'en' : 'ar';
  }

  function renderDashboard() {
    const lang = language();
    const copy = labels[lang];

    $('#nuvio-kicker').textContent = copy.eyebrow;
    $('#nuvio-dashboard-title').textContent = copy.title;
    $('#nuvio-dashboard-subtitle').textContent = copy.subtitle;

    const overviewLabels = lang === 'ar'
      ? { health: 'حالة النظام', addons: 'الإضافات المفحوصة', release: 'أحدث إصدار', downloads: 'ملفات التنزيل' }
      : { health: 'System health', addons: 'Checked add-ons', release: 'Latest release', downloads: 'Download files' };

    $$('[data-overview-label]').forEach(node => {
      node.textContent = overviewLabels[node.dataset.overviewLabel];
    });

    $('#nuvio-launch-grid').innerHTML = Object.entries(views).map(([id]) => {
      const item = copy[id];
      return `
        <a class="nuvio-launch-card" href="#${id}" data-view="${id}">
          <span class="nuvio-launch-icon" aria-hidden="true">${icon[id]}</span>
          <span class="nuvio-launch-code">${item[2]}</span>
          <strong>${item[0]}</strong>
          <span class="nuvio-launch-description">${item[1]}</span>
          <span class="nuvio-launch-open">${copy.open} <b>↗</b></span>
        </a>`;
    }).join('');
  }

  function addBackButton(section) {
    if (section.querySelector('.nuvio-view-back')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nuvio-view-back';
    button.innerHTML = '<span aria-hidden="true">←</span><span class="nuvio-back-label"></span>';
    button.addEventListener('click', () => showView('home', true));
    section.prepend(button);
  }

  Object.values(views).forEach(addBackButton);

  function showView(id, updateHistory = false) {
    const target = id === 'home' ? 'home' : (views[id] ? id : 'home');
    const home = target === 'home';

    hero.hidden = !home;
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

    if (updateHistory) {
      const hash = home ? '#home' : `#${target}`;
      history.pushState({ nuvioView: target }, '', hash);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.dataset.nuvioView = target;
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;

    const id = link.getAttribute('href').slice(1);
    if (id === 'home' || views[id]) {
      event.preventDefault();
      showView(id || 'home', true);
    }
  });

  window.addEventListener('popstate', () => {
    showView(location.hash.slice(1) || 'home', false);
  });

  $('#language-toggle')?.addEventListener('click', () => {
    requestAnimationFrame(() => {
      renderDashboard();
      $$('.nuvio-view-back .nuvio-back-label').forEach(node => {
        node.textContent = labels[language()].back;
      });
    });
  });

  function syncOverview() {
    $$('[data-overview-source]').forEach(node => {
      const source = document.getElementById(node.dataset.overviewSource);
      if (source) node.textContent = source.textContent.trim() || '—';
    });
  }

  const overviewObserver = new MutationObserver(syncOverview);
  ['health-state', 'addon-count', 'release-version', 'download-count'].forEach(id => {
    const source = document.getElementById(id);
    if (source) overviewObserver.observe(source, {
      childList: true,
      characterData: true,
      subtree: true
    });
  });

  renderDashboard();
  syncOverview();
  showView(views[location.hash.slice(1)] ? location.hash.slice(1) : 'home');
})();
