import { chromium } from 'playwright';

const errors = [];
const pageErrors = [];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('console', (msg) => {
  // Sandbox blocks a few external domains (fonts/analytics) — pre-existing noise, not app bugs.
  if (msg.type() === 'error' && !msg.text().includes('ERR_TUNNEL_CONNECTION_FAILED')) errors.push(msg.text());
});
page.on('pageerror', (err) => pageErrors.push(String(err)));

const shot = async (name) => page.screenshot({ path: `/tmp/shots/persist-${name}.png` });

// --- First launch: full manual setup, no-credential model ---
await page.goto('http://localhost:5183/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000); // welcome "loading" phase
await page.getByRole('button', { name: /Continue/ }).click();
await page.waitForURL('**/signin');
await page.waitForTimeout(500);
await page.getByText('Local mock model').click();
await page.getByRole('button', { name: 'Continue' }).click();
await page.waitForTimeout(150);
// step 2: pick a non-default effort so we can verify it round-trips
await page.getByRole('button', { name: 'High', exact: true }).click();
await shot('01-step2-filled');
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL('**/connecting');
console.log('First sign-in reached /connecting — OK');
// ConnectingScreen only calls signIn() (which persists prefs) after its own
// simulated step animation (~800ms) — wait for it to actually finish.
await page.getByRole('button', { name: 'Continue to chat' }).waitFor({ timeout: 5000 });

const prefsAfterFirstSignIn = await page.evaluate(() => localStorage.getItem('agentic-front.signin-prefs.v1'));
console.log('Saved prefs after first sign-in:', prefsAfterFirstSignIn);
if (!prefsAfterFirstSignIn) {
  console.error('FAIL: no signin-prefs saved after a successful sign-in');
  process.exitCode = 1;
}
const parsed = prefsAfterFirstSignIn ? JSON.parse(prefsAfterFirstSignIn) : null;
if (parsed && (parsed.modelId !== 'local-fake' || parsed.effort !== 'high')) {
  console.error('FAIL: saved prefs have unexpected content', parsed);
  process.exitCode = 1;
}

await page.getByRole('button', { name: 'Continue to chat' }).click();
await page.waitForURL('**/chat');
await shot('02-chat-first-run');

// --- Simulate a full app restart: fresh page load, same localStorage ---
await page.goto('http://localhost:5183/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000); // welcome "loading" phase — branding is always re-shown, that's expected
await shot('03-welcome-again');
await page.getByRole('button', { name: /Continue/ }).click();

// SignInScreen should now auto-restore + auto-advance + auto-submit straight through,
// with NO manual interaction at all, landing on /connecting on its own.
try {
  await page.waitForURL('**/connecting', { timeout: 4000 });
  console.log('PASS: second launch auto-restored and auto-submitted straight to /connecting, no clicks needed');
} catch {
  console.error('FAIL: second launch did not auto-advance to /connecting — still on', page.url());
  await shot('04-FAIL-stuck');
  process.exitCode = 1;
}
await shot('04-connecting-auto');

// Not first-run anymore, so ConnectingScreen shows a plain "Continue to chat"
// button (no carousel) once ready — that click is still manual by design.
await page.getByRole('button', { name: 'Continue to chat' }).click();
await page.waitForURL('**/chat', { timeout: 6000 }).catch(() => {});
console.log('URL after auto-flow settled:', page.url());

// --- Reset configuration should clear the saved prefs file ---
if (page.url().includes('/chat')) {
  await page.getByRole('button', { name: 'User menu' }).click();
  await page.getByText('Settings', { exact: true }).click();
  await page.getByRole('button', { name: 'Reset configuration', exact: true }).click();
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: 'Reset configuration', exact: true }).last().click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.waitForURL('**/welcome');
  const prefsAfterReset = await page.evaluate(() => localStorage.getItem('agentic-front.signin-prefs.v1'));
  console.log('Saved prefs after Reset configuration:', prefsAfterReset);
  if (prefsAfterReset !== null) {
    console.error('FAIL: signin-prefs still present after Reset configuration');
    process.exitCode = 1;
  } else {
    console.log('PASS: Reset configuration cleared the saved sign-in prefs');
  }
}

console.log('\n--- console errors ---');
console.log(errors.length ? errors.join('\n') : '(none)');
console.log('\n--- page errors ---');
console.log(pageErrors.length ? pageErrors.join('\n') : '(none)');

await browser.close();
process.exit(process.exitCode || (errors.length || pageErrors.length ? 1 : 0));
