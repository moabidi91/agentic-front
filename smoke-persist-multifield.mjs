import { chromium } from 'playwright';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const shot = (name) => page.screenshot({ path: `/tmp/shots/persist-multifield-${name}.png` });

await page.evaluate(() => localStorage.clear()).catch(() => {});

// The mock serves one model profile at a time, like a real process (ADR-024 §2): `?model=`
// picks which one, and the other cards are shown disabled. This script needs the profile
// that declares an access token and a Chat ID, so it asks for it by name.

// --- First launch: pick the multi-field model (access token + Chat ID), fill both ---
await page.goto('http://localhost:5183/?model=templated-acme', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.getByRole('button', { name: /Continue/ }).click();
await page.waitForURL('**/signin');
await page.waitForTimeout(500);
await page.getByText('Acme templated endpoint').click();
await shot('01-both-fields-visible');

const accessTokenVisible = await page.getByLabel('Access token').isVisible().catch(() => false);
const chatIdVisible = await page.getByLabel('Chat ID').isVisible().catch(() => false);
console.log('Access token field visible:', accessTokenVisible, '| Chat ID field visible:', chatIdVisible);
if (!accessTokenVisible || !chatIdVisible) {
  console.error('FAIL: expected both dynamic fields to render for the multi-field model');
  process.exitCode = 1;
}

await page.getByLabel('Access token').fill('sk-test-not-a-real-token');
await page.getByLabel('Chat ID').fill('chat_8f3a21');
await page.getByRole('button', { name: 'Continue' }).click();
await page.waitForTimeout(150);
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL('**/connecting');
await page.getByRole('button', { name: 'Continue to chat' }).click();
await page.waitForURL('**/chat');
console.log('First sign-in (multi-field model) reached /chat — OK');

const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('agentic-front.signin-prefs.v1') || 'null'));
console.log('Saved prefs:', JSON.stringify(prefs));
if (!prefs || prefs.credentials?.chat_id !== 'chat_8f3a21') {
  console.error('FAIL: chat_id was not persisted');
  process.exitCode = 1;
} else {
  console.log('PASS: non-secret chat_id was persisted');
}
if (prefs && Object.prototype.hasOwnProperty.call(prefs.credentials ?? {}, 'access_token')) {
  console.error('FAIL: secret access_token leaked into the saved prefs file:', prefs.credentials.access_token);
  process.exitCode = 1;
} else {
  console.log('PASS: secret access_token was NOT persisted');
}

// --- Second launch: chat_id should come back prefilled, access_token empty, no auto-submit ---
await page.goto('http://localhost:5183/?model=templated-acme', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.getByRole('button', { name: /Continue/ }).click();
await page.waitForURL('**/signin');
await page.waitForTimeout(600);

if (!page.url().endsWith('/signin')) {
  console.error('FAIL: expected to stay on /signin (access_token still missing), but URL is', page.url());
  process.exitCode = 1;
} else {
  console.log('PASS: stayed on /signin — access_token still required even though chat_id was restored');
}

const chatIdValueOnReturn = await page.getByLabel('Chat ID').inputValue().catch(() => null);
const accessTokenValueOnReturn = await page.getByLabel('Access token').inputValue().catch(() => null);
await shot('02-second-launch-prefilled');
console.log('Chat ID on return:', JSON.stringify(chatIdValueOnReturn), '| Access token on return:', JSON.stringify(accessTokenValueOnReturn));

if (chatIdValueOnReturn !== 'chat_8f3a21') {
  console.error('FAIL: Chat ID was not restored into the field');
  process.exitCode = 1;
} else {
  console.log('PASS: Chat ID field came back prefilled from the saved file');
}
if (accessTokenValueOnReturn) {
  console.error('FAIL: Access token field was prefilled — it must never be restored');
  process.exitCode = 1;
} else {
  console.log('PASS: Access token field is empty, as expected');
}

// Finish signing in manually with just the missing token, to confirm the flow still completes end to end.
await page.getByLabel('Access token').fill('sk-second-launch-token');
await page.getByRole('button', { name: 'Continue' }).click();
await page.waitForTimeout(150);
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL('**/connecting', { timeout: 5000 }).then(
  () => console.log('PASS: completing the missing token manually still reaches /connecting'),
  () => {
    console.error('FAIL: manual completion did not reach /connecting');
    process.exitCode = 1;
  },
);

await browser.close();
process.exit(process.exitCode || 0);
