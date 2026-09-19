import { chromium } from 'playwright';

const errors = [];
const pageErrors = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => pageErrors.push(String(err)));
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
await page.waitForURL((u) => true);
await page.waitForTimeout(300);

// --- Skills: push past the 6-item threshold via the hidden .md file input ---
const skillFiles = Array.from({ length: 8 }, (_, i) => ({
  name: `skill-${i + 1}.md`,
  mimeType: 'text/markdown',
  buffer: Buffer.from(`# skill ${i + 1}`),
}));
await page.locator('[data-testid="skills-input"]').setInputFiles(skillFiles);
await page.waitForTimeout(150);
await shot('20-skills-checklist');

const skillsListVisible = await page.getByPlaceholder('Filter selected skills…').isVisible();
console.log('Skills review list (search box) visible after 8 skills:', skillsListVisible);
const skillLabel = await page.getByText(/^Skills \(8 selected\)$/).isVisible();
console.log('Skills count label shows 8:', skillLabel);

// Remove one via the checklist checkbox
await page.getByText('skill-3', { exact: true }).locator('..').locator('input[type=checkbox]').click();
await page.waitForTimeout(100);
const skillLabelAfterRemove = await page.getByText(/^Skills \(7 selected\)$/).isVisible();
console.log('Skills count label shows 7 after uncheck-to-remove:', skillLabelAfterRemove);

// --- Prompts: load a real folder of .md files via the hidden folder input (webkitdirectory needs a real dir path) ---
await page.locator('[data-testid="prompts-input"]').setInputFiles('/tmp/test-prompts');
await page.waitForTimeout(150);
await shot('21-prompts-selected');
const promptsLabel = await page.getByText(/^Prompts \(3 selected\)$/).isVisible();
console.log('Prompts count label shows 3:', promptsLabel);
const promptChip = await page.getByText('bug-report', { exact: true }).isVisible();
console.log('Prompt chip "bug-report" visible (<=6 uses chips):', promptChip);

await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL('**/connecting');
await page.waitForTimeout(2500);
const continueBtn = page.getByRole('button', { name: 'Continue to chat' });
if (await continueBtn.isVisible()) await continueBtn.click();
await page.waitForURL('**/chat');
await page.waitForTimeout(300);
await shot('22-chat-empty-with-hint');

const hintVisible = await page.getByText(/Type \/ to insert one of your 3 saved prompts\./).isVisible();
console.log('Composer hint about prompts visible:', hintVisible);

// --- Slash palette: type "/", verify menu + filtering + keyboard select ---
const textarea = page.getByPlaceholder('Ask something…');
await textarea.click();
await textarea.type('/');
await page.waitForTimeout(100);
await shot('23-slash-menu-all');
console.log('All 3 prompts visible in menu:', await page.getByText('/daily-standup').isVisible(), await page.getByText('/bug-report').isVisible(), await page.getByText('/release-notes').isVisible());

await textarea.type('bug');
await page.waitForTimeout(100);
await shot('24-slash-menu-filtered');
console.log('Filtered to bug-report only:', await page.getByText('/bug-report').isVisible(), 'daily-standup hidden:', !(await page.getByText('/daily-standup').isVisible()));

await textarea.press('Enter');
await page.waitForTimeout(100);
await shot('25-slash-selected-content');
const draftValue = await textarea.inputValue();
console.log('Composer content after Enter-select:', JSON.stringify(draftValue));

// Escape dismiss test: type "/" again, press Escape, menu should close
await textarea.fill('');
await textarea.type('/re');
await page.waitForTimeout(100);
const beforeEscape = await page.getByText('/release-notes').isVisible();
await textarea.press('Escape');
await page.waitForTimeout(100);
const afterEscape = await page.getByText('/release-notes').isVisible().catch(() => false);
console.log('Menu visible before Escape:', beforeEscape, '| after Escape:', afterEscape);

console.log('\n--- console errors ---', errors);
console.log('--- page errors ---', pageErrors);
await browser.close();
