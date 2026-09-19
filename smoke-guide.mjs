import { chromium } from 'playwright';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const shot = (name) => page.screenshot({ path: `/tmp/shots/${name}.png` });

await page.goto('http://localhost:5183/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.getByText('Atlas', { exact: true }).click();
await page.getByText('Honeycomb', { exact: true }).click();
await page.getByRole('button', { name: /Continue/ }).click();
await page.waitForURL('**/signin');
await page.waitForTimeout(500);
await page.getByText('Local mock model').click();
await page.getByRole('button', { name: 'Continue' }).click();
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL('**/connecting');
await page.waitForTimeout(2600);
await shot('30-guide-slide-0');

for (let i = 1; i <= 5; i++) {
  await page.getByRole('button', { name: `Go to card ${i + 1}` }).click();
  await page.waitForTimeout(250);
  await shot(`30-guide-slide-${i}`);
}

await browser.close();
console.log('done');
