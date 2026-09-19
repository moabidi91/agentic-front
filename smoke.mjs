import { chromium } from 'playwright';

const errors = [];
const pageErrors = [];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
  if (msg.type() === 'log') console.log('[page]', msg.text());
});
page.on('pageerror', (err) => pageErrors.push(String(err)));

const shot = async (name) => page.screenshot({ path: `/tmp/shots/${name}.png` });

await page.goto('http://localhost:5183/', { waitUntil: 'networkidle' });
console.log('URL after /:', page.url());
await page.waitForTimeout(1200); // welcome "loading" phase
await shot('01-welcome');

// Pick a name preset + icon, continue
await page.getByText('Atlas', { exact: true }).click();
await page.getByText('Honeycomb', { exact: true }).click();
await shot('02-welcome-filled');
await page.getByRole('button', { name: /Continue/ }).click();
await page.waitForURL('**/signin');
console.log('On sign-in step 1');
await page.waitForTimeout(600); // model list load
await shot('03-signin-step1');

// select first model card (No credentials one - "Local mock model")
await page.getByText('Local mock model').click();
await shot('04-model-selected');
await page.getByRole('button', { name: 'Continue' }).click();
await shot('05-signin-step2');

await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL('**/connecting');
console.log('On connecting screen');
await page.waitForTimeout(2500);
await shot('06-connecting-guide');

await page.getByRole('button', { name: 'Continue to chat' }).click();
await page.waitForURL('**/chat');
console.log('On chat screen');
await shot('07-chat-empty');

await page.getByPlaceholder('Ask something…').fill('What is the status of the deployment?');
await page.getByRole('button', { name: 'Send' }).click();
await shot('08-chat-processing');
await page.waitForTimeout(3500);
await shot('09-chat-response');

// Debug screen (in-app nav — client state lives in memory, no full reload)
await page.locator('header').getByRole('button', { name: /^debug$/i }).click();
await page.waitForURL('**/debug');
await page.waitForTimeout(500);
await shot('10-debug');

// History screen — third tab alongside Chat/Debug
await page.locator('header').getByRole('button', { name: /^history$/i }).click();
await page.waitForURL('**/history');
await page.waitForTimeout(500);
await shot('11-history');

try {
  await page.locator('button', { hasText: 'Session started' }).first().click({ timeout: 2000 });
  await shot('12-history-drawer');
  await page.keyboard.press('Escape').catch(() => {});
  // drawer has no Escape handler — close it by clicking its backdrop instead
  await page.mouse.click(20, 20);
  await page.waitForTimeout(200);
} catch (e) {
  console.log('history drawer click skipped:', e.message);
}

// Settings modal (avatar → Settings) — State machine tab
await page.getByRole('button', { name: 'User menu' }).click();
await page.getByText('Settings', { exact: true }).click();
await page.waitForTimeout(200);
await shot('13-settings-identity');
await page.getByText('State machine', { exact: true }).click();
await page.waitForTimeout(200);
await shot('13b-settings-state-machine-conv');
await page.getByRole('button', { name: 'Plan', exact: true }).click();
await shot('14-settings-state-machine-plan');
await page.getByRole('button', { name: 'Task', exact: true }).click();
await shot('15-settings-state-machine-task');
await page.getByRole('button', { name: 'Context window', exact: true }).click();
await shot('16-settings-state-machine-ctx');

// Settings modal — Live database tab
await page.getByText('Live database', { exact: true }).click();
await page.waitForTimeout(1200);
await shot('17-settings-live-database');
await page.getByRole('button', { name: 'Events (' }).click();
await shot('18-settings-live-database-events');

// Settings modal — Danger zone → Reset configuration, back to Welcome
await page.getByRole('button', { name: 'Reset configuration', exact: true }).click(); // left-nav tab
await page.waitForTimeout(150);
await page.getByRole('button', { name: 'Reset configuration', exact: true }).last().click(); // content button
await shot('19-reset-confirm');
await page.getByRole('button', { name: 'Reset', exact: true }).click();
await page.waitForURL('**/welcome');
await shot('20-back-to-welcome');

console.log('\n--- console errors ---');
console.log(errors.length ? errors.join('\n') : '(none)');
console.log('\n--- page errors ---');
console.log(pageErrors.length ? pageErrors.join('\n') : '(none)');

await browser.close();
process.exit(errors.length || pageErrors.length ? 1 : 0);
