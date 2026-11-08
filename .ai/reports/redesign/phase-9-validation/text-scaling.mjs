import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome' });
const results = [];
try {
 const page = await browser.newPage({ viewport: { width: 320, height: 600 } });
 await page.goto('http://127.0.0.1:5197');
 await page.getByLabel('Account email').fill('owner@demo.example.test');
 await page.getByLabel('Password', { exact: true }).fill('local-demo');
 await page.getByRole('button', { name: 'Log in', exact: true }).click();
 await page.waitForURL(/dashboard/);
 for (const path of ['/dashboard','/pos','/inventory','/categories','/warehouse','/storage','/transfers','/purchasing','/payables','/customers','/accounting','/reports','/trading','/integrations','/team','/staff','/notifications','/logs','/settings/preferences','/online-store']) {
   await page.evaluate(path => { location.hash = path; }, path);
   await page.waitForTimeout(600);
   await page.evaluate(() => {
     document.documentElement.style.fontSize = '32px';
     document.documentElement.style.setProperty('--text-scale', '2');
   });
   results.push({ path, width: 320, textScale: 2, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
   if (['/pos','/settings/preferences'].includes(path)) await page.screenshot({ path: '.ai/reports/redesign/phase-9-validation/text-' + path.replaceAll('/','-') + '.png' });
 }
} finally {
 await browser.close();
 await writeFile('.ai/reports/redesign/phase-9-validation/text-scaling.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify(results));
 if(results.some(r=>r.overflow)) process.exitCode=1;
}
