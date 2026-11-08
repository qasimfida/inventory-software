/* global document, requestAnimationFrame, location, innerWidth */
const out = process.env.REDESIGN_OUT ?? '.ai/reports/redesign/before';
export const screenshot = async (page, name) => {
  const path = `${out}/screens/${name}.png`;
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  return path;
};
export async function choose(page, label, value) {
  const trigger = page.getByRole('combobox', { name: label, exact: true });
  await trigger.click();
  await page.getByRole('option', { name: value, exact: true }).click();
}
export async function settle(page) {
  await page.waitForTimeout(550);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
}

export async function extraViewports(browser, base, results) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
    timezoneId: 'UTC',
  });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date('2026-11-06T12:00:00Z'));
  await page.goto(base);
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.waitForURL(/dashboard/);
  for (const width of [844, 1024, 1280, 1920])
    for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: width === 844 ? 390 : 900 });
      await page.emulateMedia({ colorScheme: theme });
      await applyCaptureTheme(page, theme);
      for (const path of ['/pos', '/inventory', '/settings/preferences']) {
        await page.evaluate((p) => {
          location.hash = p;
        }, path);
        await settle(page);
        results.push({
          path,
          width,
          theme,
          status: 'captured',
          screenshot: await screenshot(
            page,
            `${width}-${theme}-${path.slice(1).replaceAll('/', '-')}`,
          ),
          overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        });
      }
    }
  await context.close();
}

/** Auth and isolated showcase previews have local theme state; account routes use mock persistence. */
export async function applyCaptureTheme(page, theme) {
  const control = page.getByRole('combobox', { name: 'Appearance', exact: true });
  if (await control.count())
    await choose(page, 'Appearance', theme[0].toUpperCase() + theme.slice(1));
  await page.evaluate(async (value) => {
    const { settingsModel } = await import('/src/platform/settings.ts');
    if (settingsModel.snapshot().snapshot) await settingsModel.save({ appearance: value });
    document.documentElement.dataset.theme = value;
  }, theme);
}
