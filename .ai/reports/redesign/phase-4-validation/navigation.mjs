/* global location, document, innerWidth */
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const results = [];
try {
  await page.goto('http://127.0.0.1:5197');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.waitForURL(/dashboard/);
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
  assert.equal(await page.locator('.application-shell').getAttribute('data-collapsed'), 'true');
  await page.reload();
  // Demo authentication is intentionally memory-only; layout survives a new sign-in.
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.waitForURL(/dashboard/);
  await page.locator('.application-shell').waitFor();
  assert.equal(await page.locator('.application-shell').getAttribute('data-collapsed'), 'true');
  results.push('Sidebar collapse survives reload');
  await page.getByRole('button', { name: 'Expand sidebar', exact: true }).click();
  await page.getByRole('separator', { name: 'Resize sidebar' }).focus();
  await page.keyboard.press('End');
  assert.equal(await page.getByRole('separator', { name: 'Resize sidebar' }).getAttribute('aria-valuenow'), '384');
  results.push('Keyboard sidebar resizing');
  await page.keyboard.press('Meta+k');
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  results.push('Search shortcut and Escape');
  await page.evaluate(() => { location.hash='/settings/preferences'; });
  await page.getByRole('heading', { name: 'Basic', exact: true }).waitFor();
  await page.getByRole('heading', { name: 'Advanced · Style & typography' }).waitFor();
  results.push('Preferences Basic/Advanced navigation');
  await page.setViewportSize({ width:390,height:844 });
  await page.getByRole('button', { name:'Open navigation',exact:true }).click();
  await page.getByRole('dialog').waitFor();
  await page.getByRole('dialog').getByRole('link',{name:'Inventory',exact:true}).click();
  await page.waitForURL(/inventory/);
  assert.equal(await page.getByRole('dialog').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  results.push('Mobile drawer navigation closes after destination; no document overflow');
} finally {
  await writeFile('.ai/reports/redesign/phase-4-validation/navigation.json', JSON.stringify(results,null,2));
  await browser.close();
}
console.log(results);
