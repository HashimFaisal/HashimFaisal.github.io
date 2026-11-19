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

test('Manifest share action is visible and the copy handler writes its URL', async ({ page, context }) => {
  await page.goto('/#plugins');
  await expect(page.locator('#plugins')).toBeVisible();
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  // The original copy controls are intentionally replaced visually by the
  // Nuvio share/install action; verify that visible action, then exercise the
  // original copy listener directly without clicking a hidden control.
  await expect(page.locator('#plugins .plugin-card .share-btn').first()).toBeVisible();

  const copyButton = page.locator('#plugins .plugin-card .copy-btn[data-copy]').first();
  const expected = await copyButton.getAttribute('data-copy');
  await page.evaluate(() => {
    const button = document.querySelector('#plugins .plugin-card .copy-btn[data-copy]');
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });

  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
});

test('five dashboard cards keep their text in order without overlap', async ({ page }) => {
  const cards = await page.locator('#nuvio-launch-grid .nuvio-launch-card').evaluateAll(nodes =>
    nodes.map(card => {
      const cardRect = card.getBoundingClientRect();
      const selectors = [
        '.nuvio-launch-icon',
        '.nuvio-launch-code',
        'strong',
        '.nuvio-launch-description',
        '.nuvio-launch-open'
      ];
      const items = selectors.map(selector => {
        const node = card.querySelector(selector);
        if (!node) return { selector, missing: true };
        const rect = node.getBoundingClientRect();
        return {
          selector,
          text: (node.textContent || '').trim().slice(0, 70),
          top: Math.round(rect.top * 10) / 10,
          bottom: Math.round(rect.bottom * 10) / 10,
          left: Math.round(rect.left * 10) / 10,
          right: Math.round(rect.right * 10) / 10,
          height: Math.round(rect.height * 10) / 10
        };
      });
      return {
        title: card.querySelector('strong')?.textContent?.trim(),
        card: {
          top: Math.round(cardRect.top * 10) / 10,
          bottom: Math.round(cardRect.bottom * 10) / 10,
          left: Math.round(cardRect.left * 10) / 10,
          right: Math.round(cardRect.right * 10) / 10,
          height: Math.round(cardRect.height * 10) / 10
        },
        items
      };
    })
  );
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  console.log('DASHBOARD_CARD_GEOMETRY', JSON.stringify({ viewportWidth, cards }));
  expect(cards).toHaveLength(5);
  for (const card of cards) {
    expect(card.items.every(item => !item.missing), JSON.stringify(card)).toBe(true);
    for (let i = 1; i < card.items.length; i++) {
      expect(card.items[i].top, JSON.stringify(card)).toBeGreaterThanOrEqual(card.items[i - 1].bottom - 1);
    }
    expect(card.items.every(item =>
      item.left >= card.card.left - 1 && item.right <= card.card.right + 1
    ), JSON.stringify(card)).toBe(true);
    expect(card.card.left, JSON.stringify(card)).toBeGreaterThanOrEqual(-1);
    expect(card.card.right, JSON.stringify(card)).toBeLessThanOrEqual(viewportWidth + 1);
  }
});

test('page cannot be horizontally scrolled at the selected viewport', async ({ page }) => {
  const diagnostics = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll('body *')].map(element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        tag: element.tagName.toLowerCase(),
        id: element.id || '',
        className: typeof element.className === 'string' ? element.className : '',
        left: Math.round(rect.left * 100) / 100,
        right: Math.round(rect.right * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
        position: style.position,
        transform: style.transform,
        overflowX: style.overflowX
      };
    }).filter(item => item.width > 0 && (item.left < -1 || item.right > width + 1))
      .sort((a, b) => (b.right - width) - (a.right - width));
    return {
      viewport: width,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      bodyOverflowX: getComputedStyle(document.body).overflowX,
      htmlOverflowX: getComputedStyle(document.documentElement).overflowX,
      offenders: offenders.slice(0, 30)
    };
  });

  await page.evaluate(() => window.scrollTo({ left: 1000, top: 0, behavior: 'instant' }));
  const horizontalScroll = await page.evaluate(() => window.scrollX);
  console.log('HORIZONTAL_OVERFLOW_DIAGNOSTICS', JSON.stringify({ ...diagnostics, horizontalScroll }));
  expect(horizontalScroll, JSON.stringify({ ...diagnostics, horizontalScroll })).toBe(0);
});

test('home hero title and supporting text stay aligned without overlap', async ({ page }) => {
  const layout = await page.locator('.hero').evaluate(hero => {
    const copy = hero.querySelector('.hero-copy');
    const copyRect = copy.getBoundingClientRect();
    const heroRect = hero.getBoundingClientRect();
    const selectors = ['h1', ':scope > p', '.hero-actions', '.hero-meta'];
    const items = selectors.map(selector => {
      const node = copy.querySelector(selector);
      const rect = node.getBoundingClientRect();
      return {
        selector,
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right
      };
    });
    return {
      hero: { top: heroRect.top, bottom: heroRect.bottom, left: heroRect.left, right: heroRect.right },
      copy: { top: copyRect.top, bottom: copyRect.bottom, left: copyRect.left, right: copyRect.right },
      headingPosition: getComputedStyle(copy.querySelector('h1')).position,
      badgePosition: getComputedStyle(copy, '::before').position,
      items
    };
  });

  expect(layout.headingPosition).not.toBe('absolute');
  expect(layout.badgePosition).toBe('static');
  for (let i = 1; i < layout.items.length; i++) {
    expect(layout.items[i].top, JSON.stringify(layout)).toBeGreaterThanOrEqual(layout.items[i - 1].bottom - 1);
  }
  for (const item of layout.items) {
    expect(item.left, JSON.stringify(layout)).toBeGreaterThanOrEqual(layout.copy.left - 1);
    expect(item.right, JSON.stringify(layout)).toBeLessThanOrEqual(layout.copy.right + 1);
    expect(item.top, JSON.stringify(layout)).toBeGreaterThanOrEqual(layout.hero.top - 1);
    expect(item.bottom, JSON.stringify(layout)).toBeLessThanOrEqual(layout.hero.bottom + 1);
  }
});


test('home dashboard cards stack vertically on compact screens in both languages', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const assertStacked = async () => {
    const layout = await page.locator('#nuvio-launch-grid').evaluate(grid => {
      const gridStyle = getComputedStyle(grid);
      const cards = [...grid.querySelectorAll('.nuvio-launch-card')].map(card => {
        const rect = card.getBoundingClientRect();
        return {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          column: getComputedStyle(card).gridColumn
        };
      });
      return {
        columns: gridStyle.gridTemplateColumns.trim().split(' ').filter(Boolean).length,
        cards
      };
    });

    expect(layout.columns, JSON.stringify(layout)).toBe(1);
    expect(layout.cards).toHaveLength(5);
    for (let i = 0; i < layout.cards.length; i++) {
      const card = layout.cards[i];
      expect(card.column, JSON.stringify(layout)).toBe('1 / -1');
      expect(card.right - card.left, JSON.stringify(layout)).toBeGreaterThan(300);
      if (i > 0) {
        expect(card.top, JSON.stringify(layout)).toBeGreaterThanOrEqual(layout.cards[i - 1].bottom);
      }
    }
  };

  await assertStacked();
  await page.locator('#language-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await assertStacked();
});


test('plugin library cards never overlap across responsive widths and languages', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#nuvio-launch-grid [data-view="plugins"]').click();
  await expect(page.locator('#plugins')).toBeVisible();

  const widths = [320, 360, 390, 430, 480, 560, 561, 600, 760, 761, 900, 1000, 1001, 1280, 1440];

  const assertLibraryLayout = async width => {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page.locator('#plugins').evaluate(section => {
      const rectOf = element => {
        const rect = element.getBoundingClientRect();
        return {
          top: rect.top, bottom: rect.bottom,
          left: rect.left, right: rect.right,
          width: rect.width, height: rect.height
        };
      };
      const overlaps = (a, b) =>
        Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
        Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
      const grid = section.querySelector('.plugin-grid');
      const cards = [...grid.querySelectorAll('.plugin-card:not([hidden])')].map(card => {
        const cardRect = rectOf(card);
        const children = [...card.children]
          .filter(node => {
            const style = getComputedStyle(node);
            const rect = node.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' &&
              rect.width > 0 && rect.height > 0;
          })
          .map(node => ({ name: node.className || node.tagName, rect: rectOf(node) }));
        const nested = ['.plugin-top', '.card-actions'].flatMap(selector => {
          const parent = card.querySelector(selector);
          if (!parent) return [];
          const items = [...parent.children]
            .filter(node => getComputedStyle(node).display !== 'none')
            .map(node => ({ name: node.className || node.tagName, rect: rectOf(node) }));
          const collisions = [];
          for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
              if (overlaps(items[i].rect, items[j].rect)) {
                collisions.push([items[i].name, items[j].name]);
              }
            }
          }
          return collisions.map(pair => ({ parent: selector, pair }));
        });
        const collisions = [];
        for (let i = 0; i < children.length; i++) {
          for (let j = i + 1; j < children.length; j++) {
            if (overlaps(children[i].rect, children[j].rect)) {
              collisions.push([children[i].name, children[j].name]);
            }
          }
        }
        return {
          title: card.querySelector('h3')?.textContent?.trim(),
          rect: cardRect,
          children,
          collisions,
          nestedCollisions: nested,
          outside: children.filter(item =>
            item.rect.left < cardRect.left - 1 ||
            item.rect.right > cardRect.right + 1 ||
            item.rect.top < cardRect.top - 1 ||
            item.rect.bottom > cardRect.bottom + 1
          ).map(item => item.name)
        };
      });
      const cardCollisions = [];
      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          if (overlaps(cards[i].rect, cards[j].rect)) {
            cardCollisions.push([cards[i].title, cards[j].title]);
          }
        }
      }
      const gridStyle = getComputedStyle(grid);
      return {
        columns: gridStyle.gridTemplateColumns.trim().split(' ').filter(Boolean).length,
        cards,
        cardCollisions,
        sectionWidth: rectOf(section).width,
        viewportWidth: document.documentElement.clientWidth
      };
    });

    const expectedColumns = await page.evaluate(() =>
      window.matchMedia('(max-width: 560px)').matches
        ? 1
        : window.matchMedia('(max-width: 1000px)').matches ? 2 : 3
    );
    expect(layout.columns, JSON.stringify(layout)).toBe(expectedColumns);
    expect(layout.cards, JSON.stringify(layout)).toHaveLength(21);
    expect(layout.cardCollisions, JSON.stringify(layout)).toEqual([]);
    for (const card of layout.cards) {
      expect(card.collisions, JSON.stringify(card)).toEqual([]);
      expect(card.nestedCollisions, JSON.stringify(card)).toEqual([]);
      expect(card.outside, JSON.stringify(card)).toEqual([]);
      expect(card.rect.left, JSON.stringify(card)).toBeGreaterThanOrEqual(-1);
      expect(card.rect.right, JSON.stringify(card)).toBeLessThanOrEqual(layout.viewportWidth + 1);
    }
  };

  for (const width of widths) await assertLibraryLayout(width);

  await page.locator('#language-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  for (const width of widths) await assertLibraryLayout(width);
});

test('status and developer-resource cards keep separate layout boxes on phone, tablet, and desktop', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const widths = [320, 390, 560, 760, 900, 1280];

  const assertNoCardCollisions = async selector => {
    const result = await page.locator(selector).evaluate(container => {
      const nodes = [...container.children].filter(node => {
        const rect = node.getBoundingClientRect();
        return getComputedStyle(node).display !== 'none' && rect.width > 0 && rect.height > 0;
      });
      const boxes = nodes.map(node => {
        const rect = node.getBoundingClientRect();
        return {
          name: node.querySelector('strong, span')?.textContent?.trim() || node.className,
          left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom
        };
      });
      const collisions = [];
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const horizontal = Math.min(boxes[i].right, boxes[j].right) - Math.max(boxes[i].left, boxes[j].left);
          const vertical = Math.min(boxes[i].bottom, boxes[j].bottom) - Math.max(boxes[i].top, boxes[j].top);
          if (horizontal > 1 && vertical > 1) collisions.push([boxes[i].name, boxes[j].name]);
        }
      }
      return { boxes, collisions };
    });
    expect(result.collisions, JSON.stringify(result)).toEqual([]);
  };

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('#nuvio-launch-grid [data-view="status"]').click();
    await expect(page.locator('#status')).toBeVisible();
    await assertNoCardCollisions('#status');
    await page.locator('#status .nuvio-view-back').click();

    await page.locator('#nuvio-launch-grid [data-view="resources"]').click();
    await expect(page.locator('#resources')).toBeVisible();
    await assertNoCardCollisions('#resources .resource-links');
    await page.locator('#resources .nuvio-view-back').click();
  }
});
