// Browser smoke test against a deployed environment. Usage: npm run smoke:ui
// Needs Chrome: set CHROME_PATH, otherwise common install locations are tried.
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

import { BASE_URL, EMAIL, PASSWORD, check, cleanupTestData, finish, getIdToken } from './common.mjs';

const chromePath =
  process.env.CHROME_PATH ??
  [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ].find(candidate => fs.existsSync(candidate));

if (!chromePath) {
  console.error('Chrome not found. Set CHROME_PATH.');
  process.exit(2);
}

const browser = await puppeteer.launch({ executablePath: chromePath, headless: true, args: ['--no-sandbox'] });
const pageErrors = [];
const consoleErrors = [];

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle2' });
  await page.type('input[type="email"]', EMAIL);
  await page.type('input[type="password"]', PASSWORD);
  await Promise.all([
    page.waitForFunction(() => !location.pathname.startsWith('/auth'), { timeout: 30000 }),
    page.click('button[type="submit"]')
  ]);
  check('login through the form', true);

  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.dashboard-main__header h1', { timeout: 30000 });
  check('dashboard renders 4 sections', (await page.$$('.dashboard-section')).length === 4);

  await page.click('.dashboard-sidebar__profile > button');
  check('profile menu opens', (await page.$$('.dashboard-sidebar__profile .btn')).length === 3);
  await page.click('.dashboard-sidebar__profile .btn--ghost');
  await page.waitForSelector('#nickname-modal-title', { timeout: 5000 });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#nickname-modal-title'), { timeout: 5000 });
  check('nickname modal opens and closes with Escape', true);

  await page.goto(`${BASE_URL}/chat?characterId=1`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.chat-layout__messages', { timeout: 30000 });
  const greeting = await page.$eval('.chat-message__bubble--assistant', node => node.textContent ?? '');
  check('chat shows the Dayeon greeting', greeting.includes('오늘 하루는 어땠어'), greeting);

  const before = await page.$$eval('.chat-message', nodes => nodes.length);
  await page.type('.chat-input textarea', '한 줄짜리 짧은 인사만 해줘.');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => new URL(location.href).searchParams.has('threadId'), { timeout: 90000 });
  await page.waitForFunction(count => document.querySelectorAll('.chat-message').length >= count + 2, { timeout: 10000 }, before);
  const reply = await page.$$eval('.chat-message__bubble--assistant', nodes => nodes.at(-1)?.textContent ?? '');
  check('chat sends a message and shows the reply', reply.trim().length > 0, reply);

  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForFunction(() => document.querySelectorAll('.chat-message').length >= 2, { timeout: 30000 });
  check('conversation restored after reload', true);
} catch (error) {
  check('ui smoke run', false, error.message);
} finally {
  await browser.close();
  check('no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
  const relevant = consoleErrors.filter(text => !/youtube|favicon|googletagmanager|net::/i.test(text));
  check('no console errors (third-party excluded)', relevant.length === 0, relevant.slice(0, 3).join(' | '));
  const idToken = await getIdToken().catch(() => null);
  check('cleanup: test data removed', idToken ? await cleanupTestData(idToken).catch(() => false) : false);
  finish();
}
