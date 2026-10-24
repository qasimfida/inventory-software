// Disposable API CORS_ORIGINS must include both localhost and 127.0.0.1 at E2E_WEB_URL's port.
import { expect } from '@playwright/test';

export async function exerciseSessionHosts(browser, email, password) {
  for (const hostname of ['localhost', '127.0.0.1']) {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      const url = new URL(process.env.E2E_WEB_URL);
      url.hostname = hostname;
      await page.goto(url.href);
      await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeEnabled();
      await expect(page.getByRole('alert')).toHaveCount(0);
      const rejected = [];
      let authenticated = false;
      page.on('response', (response) => {
        const path = new URL(response.url()).pathname;
        if (path.endsWith('/auth/login') && response.ok()) authenticated = true;
        if (authenticated && response.status() === 401) rejected.push(path);
      });
      await page.getByLabel('Account email', { exact: true }).fill(email);
      await page.getByLabel('Password', { exact: true }).fill(password);
      await page.getByRole('button', { name: 'Log in', exact: true }).click();
      await expect(page.getByRole('region', { name: 'Workspace overview' })).toBeVisible();
      await page.reload();
      await expect(page.getByRole('region', { name: 'Workspace overview' })).toBeVisible();
      await page
        .getByRole('navigation', { name: 'Workspace sections' })
        .getByRole('button', { name: 'Catalog & pricing' })
        .click();
      await expect(page.getByRole('button', { name: 'New product', exact: true })).toBeVisible();
      expect(rejected).toEqual([]);
      const cookie = (await context.cookies()).find((entry) => entry.name === 'inventory_session');
      expect(cookie?.httpOnly).toBe(true);
      expect(cookie?.sameSite).toBe('Strict');
      await page.getByText('Account & sessions', { exact: true }).click();
      await page.getByRole('button', { name: 'Log out', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();
      console.log(
        `PASS ${hostname}: cookie login, reload, protected catalog and logout; no authenticated 401s`,
      );
    } finally {
      await context.close();
    }
  }
}
