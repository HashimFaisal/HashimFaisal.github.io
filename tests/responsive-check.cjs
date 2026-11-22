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
          dashboardCards: [...document.querySelectorAll('.nuvio-launch-card')].map(el => {
            const r = el.getBoundingClientRect();
            const childOverflow = [...el.children].some(child => {
              const c = child.getBoundingClientRect();
              return c.left < r.left - 1 || c.right > r.right + 1 ||
                c.top < r.top - 1 || c.bottom > r.bottom + 1;
            });
            return { title: el.querySelector('strong')?.textContent || '', ...rect(el), childOverflow };
          }),
        };
      });

      await page.locator('#nuvio-launch-grid [data-view="downloads"]').click();
      await page.waitForSelector('#downloads.nuvio-view-active', { timeout: 10000 });
      await page.waitForFunction(() => document.querySelectorAll('#downloads #download-grid .release-asset-card').length === 5, null, { timeout: 12000 });
      const downloadLayout = await page.evaluate(() => {
        const section = document.querySelector('#downloads');
        const downloadsSectionCount = document.querySelectorAll('main > #downloads').length;
        const legacyComponents = section.querySelectorAll(
          '.app-versions, .unified-download-library, .version-platform, .version-grid, .version-card, .version-card-status, .version-download, .version-kind, .version-actions, .version-disclaimer, .download-card, .download-library-card, .download-release-subsection, .downloads-release-panel, .download-grid'
        ).length;
        const releaseAssetsGrid = Boolean(document.querySelector('#download-grid.release-assets-grid'));
        const groups = [...section.querySelectorAll('.downloads-device-section')];
        const expectedIds = ['versions-mobile','versions-desktop','versions-tv','versions-smart-tv'];
        const ids = groups.map(group => group.id);
        const overlaps = [];
        const rects = groups.map(group => ({id: group.id, rect: group.getBoundingClientRect()}));
        for (let i=0;i<rects.length;i++) for (let j=i+1;j<rects.length;j++) {
          const a=rects[i].rect,b=rects[j].rect;
          if (a.left<b.right-1 && a.right>b.left+1 && a.top<b.bottom-1 && a.bottom>b.top+1) overlaps.push([rects[i].id,rects[j].id]);
        }
        const children=[...section.children].filter(el=>!el.classList.contains('nuvio-view-back')&&getComputedStyle(el).display!=='none');
        const siblingOverlaps=[];
        for(let i=0;i<children.length;i++)for(let j=i+1;j<children.length;j++){
          const a=children[i].getBoundingClientRect(),b=children[j].getBoundingClientRect();
          if(a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1)siblingOverlaps.push([children[i].className,children[j].className]);
        }
        const grid=document.querySelector('#download-grid');
        const cards=[...grid.querySelectorAll('.release-asset-card')].filter(card=>!card.hidden);
        const columns=getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
        const mobileGroup=section.querySelector('#versions-mobile');
        const mobileGrid=mobileGroup?.querySelector('.downloads-device-grid');
        const latest=mobileGroup?.querySelector('.downloads-mobile-release-assets');
        const mobileGridRect=mobileGrid?.getBoundingClientRect(),latestRect=latest?.getBoundingClientRect(),gridRect=grid.getBoundingClientRect();
        const latestReleaseOverlap=Boolean(mobileGridRect&&latestRect&&mobileGridRect.left<latestRect.right-1&&mobileGridRect.right>latestRect.left+1&&mobileGridRect.top<latestRect.bottom-1&&mobileGridRect.bottom>latestRect.top+1);
        const cardsWithinGrid=cards.every(card=>{const r=card.getBoundingClientRect();return r.left>=gridRect.left-1&&r.right<=gridRect.right+1;});
        const platformCardCounts=groups.map(group=>group.querySelectorAll('.downloads-device-card').length);
        return {downloadsSectionCount,legacyComponents,releaseAssetsGrid,ids,expectedIds,groupsCount:groups.length,overlaps,siblingOverlaps,cardCount:cards.length,columns,statusVisible:!document.querySelector('#status').hidden,legacyVersionsSection:!!document.querySelector('#versions'),latestReleaseOverlap,cardsWithinGrid,platformCardCounts};
      });
      const expectedColumns = viewport.width <= 480 ? 1 : viewport.width <= 1000 ? 2 : 3;
      if (downloadLayout.downloadsSectionCount !== 1) failures.push(viewport.name + ': expected exactly one Downloads Center section');
      if (downloadLayout.legacyComponents) failures.push(viewport.name + ': legacy download components remain (' + downloadLayout.legacyComponents + ')');
      if (!downloadLayout.releaseAssetsGrid) failures.push(viewport.name + ': isolated release-assets grid is missing');
      if (downloadLayout.groupsCount !== 4 || JSON.stringify(downloadLayout.ids) !== JSON.stringify(downloadLayout.expectedIds)) failures.push(viewport.name + ': platform groups missing or out of order ' + JSON.stringify(downloadLayout.ids));
      if (downloadLayout.overlaps.length) failures.push(viewport.name + ': platform groups overlap ' + JSON.stringify(downloadLayout.overlaps));
      if (downloadLayout.siblingOverlaps.length) failures.push(viewport.name + ': downloads children overlap ' + JSON.stringify(downloadLayout.siblingOverlaps));
      if (downloadLayout.cardCount !== 5) failures.push(viewport.name + ': expected 5 latest-release assets, found ' + downloadLayout.cardCount);
      if (downloadLayout.columns !== expectedColumns) failures.push(viewport.name + ': latest-release grid expected ' + expectedColumns + ' columns, found ' + downloadLayout.columns);
      if (downloadLayout.statusVisible) failures.push(viewport.name + ': System Status appears in Downloads view');
      if (downloadLayout.legacyVersionsSection) failures.push(viewport.name + ': old versions section remains');
      if (downloadLayout.latestReleaseOverlap) failures.push(viewport.name + ': latest release overlaps mobile editions');
      if (!downloadLayout.cardsWithinGrid) failures.push(viewport.name + ': latest release card escapes grid');
      if (JSON.stringify(downloadLayout.platformCardCounts) !== JSON.stringify([3,1,5,2])) failures.push(viewport.name + ': unexpected platform card counts ' + JSON.stringify(downloadLayout.platformCardCounts));
      await page.locator('#downloads .nuvio-view-back').click();
      const screenshot = path.join(outputDir, viewport.name + '.png');
      await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });

      const result = {
        downloadLayout,
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
      if (metrics.dashboardCards.length !== 5) failures.push(viewport.name + ': expected 5 dashboard cards, found ' + metrics.dashboardCards.length);
      if (metrics.dashboardCards.some(card => card.childOverflow)) failures.push(viewport.name + ': dashboard card content extends outside its card');
      if (viewport.width <= 430 && metrics.dashboardCards.some(card => card.height > 205)) failures.push(viewport.name + ': mobile dashboard card exceeds 205px height');
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
