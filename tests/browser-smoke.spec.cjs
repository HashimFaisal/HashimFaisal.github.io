const { test, expect } = require('@playwright/test');

const runtimeErrors = new WeakMap();

test.beforeEach(async ({ page }) => {
  runtimeErrors.set(page, []);
  page.on('pageerror', error => runtimeErrors.get(page).push(error.message));

  await page.addInitScript(() => {
    localStorage.setItem('nuvio-language', 'ar');
  });

  // Keep the smoke suite deterministic and independent of third-party uptime.
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
      await route.continue();
    } else {
      await route.abort();
    }
  });

  await page.goto('/');
  await expect(page.locator('#nuvio-launch-grid .nuvio-launch-card')).toHaveCount(5);
  await expect(page.locator('.plugin-card')).toHaveCount(21);
});

test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page) || []).toEqual([]);
});

test('language toggle works in RTL and LTR, including the back label inside a section', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

  await page.locator('#language-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('#search')).toHaveAttribute('placeholder', 'Search add-ons...');

  await page.locator('#nuvio-launch-grid [data-view="plugins"]').click();
  await expect(page.locator('#plugins')).toBeVisible();
  await expect(page.locator('#plugins .nuvio-back-label')).toHaveText('Back to dashboard');

  await page.locator('#language-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('#plugins .nuvio-back-label')).toHaveText('العودة إلى الرئيسية');

  await page.locator('#plugins .nuvio-view-back').click();
  await expect(page.locator('#nuvio-dashboard')).toBeVisible();
});

test('all five dashboard destinations open and return to the dashboard', async ({ page }) => {
  const destinations = [
    ['plugins', '#plugins'],
    ['downloads', '#downloads'],
    ['status', '#status'],
    ['changelog', '#changelog'],
    ['resources', '#resources']
  ];

  for (const [view, selector] of destinations) {
    await page.locator(`#nuvio-launch-grid [data-view="${view}"]`).click();
    await expect(page.locator(selector)).toBeVisible();
    await page.locator(`${selector} .nuvio-view-back`).click();
    await expect(page.locator('#nuvio-dashboard')).toBeVisible();
  }
});

test('plugin search and category filters return the expected cards', async ({ page }) => {
  await page.locator('#nuvio-launch-grid [data-view="plugins"]').click();

  await page.locator('#search').fill('CinemaBox');
  await expect(page.locator('.plugin-card:visible')).toHaveCount(1);
  await expect(page.locator('.plugin-card:visible h3')).toHaveText('CinemaBox');

  await page.locator('#search').fill('');
  await page.locator('[data-filter="subtitles"]').click();
  await expect(page.locator('.plugin-card:visible')).toHaveCount(3);

  await page.locator('[data-filter="ratings"]').click();
  await expect(page.locator('.plugin-card:visible')).toHaveCount(8);

  await page.locator('[data-filter="all"]').click();
  await expect(page.locator('.plugin-card:visible')).toHaveCount(21);

  await page.locator('#search').fill('no-such-addon-987');
  await expect(page.locator('#empty-state')).toBeVisible();
  await expect(page.locator('.plugin-card:visible')).toHaveCount(0);
});

test('manifest copy button writes its URL to the clipboard', async ({ page, context }) => {
  await page.locator('#nuvio-launch-grid [data-view="plugins"]').click();
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  const copyButton = page.locator('.plugin-card .copy-btn[data-copy]').first();
  const expected = await copyButton.getAttribute('data-copy');
  await copyButton.click();

  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
});

test('page has no horizontal overflow at the selected viewport', async ({ page }) => {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth
  }));

  expect(dimensions.document, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.body, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport);
});
