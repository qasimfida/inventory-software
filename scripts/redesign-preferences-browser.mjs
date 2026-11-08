/* global document, getComputedStyle, innerWidth */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out = '.ai/reports/redesign/phase-3-validation';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:5197/#/design-system');
  await page.getByRole('heading', { name: 'Design system', exact: true }).waitFor();
  await page
    .getByRole('group', { name: 'Preview control size', exact: true })
    .locator('label')
    .filter({ hasText: /^large$/ })
    .click();
  assert.equal(await page.locator('html').getAttribute('data-control-size'), 'large');
  await page
    .getByRole('group', { name: 'Preview density', exact: true })
    .locator('label')
    .filter({ hasText: /^compact$/ })
    .click();
  assert.equal(await page.locator('html').getAttribute('data-control-size'), 'large');
  await page
    .getByRole('group', { name: 'Preview animation', exact: true })
    .locator('label')
    .filter({ hasText: /^off$/ })
    .click();
  assert.equal(await page.locator('html').getAttribute('data-motion'), 'disabled');
  for (const size of ['small', 'medium', 'large']) {
    const heights = [];
    for (const density of ['compact', 'default', 'comfortable']) {
      await page.evaluate(
        ({ size, density }) =>
          Object.assign(document.documentElement.dataset, {
            controlSize: size,
            density,
            textSize: 'medium',
          }),
        { size, density },
      );
      heights.push(
        await page
          .getByRole('combobox', { name: 'Preview yes or no' })
          .evaluate((el) => el.getBoundingClientRect().height),
      );
    }
    assert.equal(new Set(heights).size, 1, `Density resized ${size} select: ${heights}`);
  }
  // CSS combination probe is separate from the real control wiring checks above.
  for (const width of [390, 1440])
    for (const theme of ['light', 'dark'])
      for (const density of ['compact', 'default', 'comfortable'])
        for (const size of ['small', 'medium', 'large']) {
          await page.setViewportSize({ width, height: 900 });
          const result = await page.evaluate(
            ({ theme, density, size }) => {
              const root = document.documentElement;
              Object.assign(root.dataset, {
                theme,
                density,
                controlSize: size,
                textSize: size === 'large' ? 'large' : 'small',
                radius: size === 'large' ? 'circle' : 'rounded',
                accent: 'teal',
              });
              const style = getComputedStyle(root);
              const button = document.querySelector('[data-slot="button"][data-variant="default"]');
              return {
                theme,
                density,
                size,
                control: style.getPropertyValue('--control-height').trim(),
                row: style.getPropertyValue('--table-row-height').trim(),
                primary: style.getPropertyValue('--primary').trim(),
                accent: style.getPropertyValue('--accent').trim(),
                button: button ? getComputedStyle(button).backgroundColor : null,
                overflow: root.scrollWidth > innerWidth,
              };
            },
            { theme, density, size },
          );
          assert.equal(result.control, { small: '30px', medium: '34px', large: '40px' }[size]);
          assert.equal(
            result.row,
            { compact: '32px', default: '40px', comfortable: '48px' }[density],
          );
          assert.notEqual(result.primary, result.accent);
          results.push({ width, ...result });
        }
  for (const width of [390, 1440])
    for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(
        (theme) =>
          Object.assign(document.documentElement.dataset, {
            theme,
            density: 'compact',
            controlSize: 'medium',
            textSize: 'medium',
            radius: 'rounded',
          }),
        theme,
      );
      await page.screenshot({
        path: `${out}/showcase-${width}-${theme}.png`,
        fullPage: true,
        animations: 'disabled',
      });
    }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const motion = await page.evaluate(() => {
    const el = document.querySelector('[data-slot="button"]');
    return el ? getComputedStyle(el).transitionDuration : null;
  });
  assert.equal(motion, '0s');
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/preferences.json`,
    JSON.stringify(
      {
        results,
        errors,
        reducedMotion: motion,
        note: '36 CSS corners plus real preview radio wiring; browser, not native qualification.',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `${results.length} CSS combinations and preview wiring passed; ${results.filter((x) => x.overflow).length} document overflow cases.`,
  );
} finally {
  await browser.close();
}
