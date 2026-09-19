import { chromium } from 'playwright';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const shot = (name) => page.screenshot({ path: `/tmp/shots/persist-token-${name}.png` });

await page.evaluate(() => localStorage.clear()).catch(() => {});

// --- First launch: pick a credential model, fill token, sign in ---
await page.goto('http://localhost:5183/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.getByRole('button', { name: /Continue/ }).click();
await page.waitForURL('**/signin');
await page.waitForTimeout(500);
await page.getByText('Generic HTTP provider').click();
await page.getByPlaceholder('Paste an access token').fill('sk-test-not-a-real-token');
await page.getByRole('button', { name: 'Continue' }).click();
await page.waitForTimeout(150);
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL('**/connecting');
await page.getByRole('button', { name: 'Continue to chat' }).click();
await page.waitForURL('**/chat');
console.log('First sign-in (credential model) reached /chat — OK');

// --- Second launch: must land back on step 1, prefilled, token empty, NOT auto-submitted ---
await page.goto('http://localhost:5183/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.getByRole('button', { name: /Continue/ }).click();
await page.waitForURL('**/signin');
await page.waitForTimeout(600); // let the async restore + model list land

const url = page.url();
if (!url.endsWith('/signin')) {
  console.error('FAIL: expected to stay on /signin for a credential model, but URL is', url);
  process.exitCode = 1;
} else {
  console.log('PASS: stayed on /signin (did not auto-submit) — a token is still required');
}

const userIdValue = await page.locator('#userid').inputValue();
const tokenField = page.getByPlaceholder('Paste an access token');
const tokenVisible = await tokenField.isVisible().catch(() => false);
const tokenValue = tokenVisible ? await tokenField.inputValue() : null;
await shot('01-step1-prefilled-token-empty');

console.log('userId prefilled:', userIdValue);
console.log('token field visible (model preselected):', tokenVisible, '| token value:', JSON.stringify(tokenValue));

if (userIdValue !== 'hama.local') {
  console.error('FAIL: userId was not restored, got', JSON.stringify(userIdValue));
  process.exitCode = 1;
}
if (!tokenVisible) {
  console.error('FAIL: token field not shown — model was not preselected from saved prefs');
  process.exitCode = 1;
}
if (tokenValue) {
  console.error('FAIL: token was restored/prefilled — it must never be persisted:', tokenValue);
  process.exitCode = 1;
}
if (!tokenValue) {
  console.log('PASS: access token was NOT restored (never persisted), field is empty as expected');
}

await browser.close();
process.exit(process.exitCode || 0);
