const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const outputDir = path.join(process.cwd(), 'artifacts', 'responsive');
fs.mkdirSync(outputDir, { recursive: true });

const viewports = [
  { name: 'phone-320', width: 320, height: 740 },
  { name: 'phone-360', width: 360, height: 800 },
  { name: 'phone-390', width: 390, height: 844 },
  { name: 'phone-430', width: 430, height: 932 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'laptop-1024', width: 1024, height: 768 },
  { name: 'desktop-1366', width: 1366, height: 900 },
  { name: 'desktop-1920', width: 1920, height: 1080 },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = [];
  const failures = [];

  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.width <= 430 ? 2 : 1,
      });
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));

      const response = await page.goto('http://127.0.0.1:4173/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await page.waitForSelector('#nuvio-dashboard', { timeout: 10000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(900);

      const metrics = await page.evaluate(() => {
        const rect = element => {
          const r = element.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
        };
        const visible = element => {
          const style = getComputedStyle(element);
          const r = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0;
        };
        const topbar = document.querySelector('.topbar');
        const topbarItems = topbar
          ? [...topbar.children].filter(visible).map(el => ({
              selector: el.className || el.tagName.toLowerCase(),
              ...rect(el),
            }))
          : [];
        const overlaps = [];
        for (let i = 0; i < topbarItems.length; i++) {
          for (let j = i + 1; j < topbarItems.length; j++) {
            const a = topbarItems[i];
            const b = topbarItems[j];
            const intersects = a.x < b.right - 1 && a.right > b.x + 1 &&
              a.y < b.bottom - 1 && a.bottom > b.y + 1;
            if (intersects) overlaps.push([a.selector, b.selector]);
          }
        }
        return {
          viewport: { width: innerWidth, height: innerHeight },
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
          dashboardPresent: !!document.querySelector('#nuvio-dashboard'),
          heroPresent: !!document.querySelector('.hero'),
          globeVideoPresent: !!document.querySelector('.globe-video'),
          pluginCards: document.querySelectorAll('.plugin-card').length,
          topbarItems,
          topbarOverlaps: overlaps,
          hero: document.querySelector('.hero') ? rect(document.querySelector('.hero')) : null,
          dashboard: document.querySelector('#nuvio-dashboard') ? rect(document.querySelector('#nuvio-dashboard')) : null,
        };
      });

      const screenshot = path.join(outputDir, viewport.name + '.png');
      await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });

      const result = {
        name: viewport.name,
        status: response ? response.status() : null,
        ...metrics,
        pageErrors,
        screenshot,
      };
      report.push(result);

      if (result.status !== 200) failures.push(viewport.name + ': HTTP ' + result.status);
      if (metrics.horizontalOverflow) failures.push(viewport.name + ': horizontal overflow (' + metrics.documentWidth + 'px document / ' + viewport.width + 'px viewport)');
      if (metrics.topbarOverlaps.length) failures.push(viewport.name + ': topbar overlaps ' + JSON.stringify(metrics.topbarOverlaps));
      if (!metrics.dashboardPresent || !metrics.heroPresent || !metrics.globeVideoPresent) failures.push(viewport.name + ': missing key homepage element');
      if (pageErrors.length) failures.push(viewport.name + ': browser errors ' + pageErrors.join(' | '));

      console.log(JSON.stringify(result));
      await page.close();
    }
  } finally {
    await browser.close();
  }

  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify({ report, failures }, null, 2));
  console.log('\nResponsive QA summary: ' + report.length + ' viewports checked, ' + failures.length + ' failures.');
  if (failures.length) {
    console.error(failures.map(item => '- ' + item).join('\n'));
    process.exitCode = 1;
  }
})();
