'use strict';

const { test, expect } = require('@playwright/test');
const { boot } = require('./helpers');

test.describe('telescreen shell', () => {
  test('loads cleanly with no console errors or CSP violations', async ({ page }) => {
    const errors = await boot(page);
    await expect(page).toHaveTitle('GÖZETİM ALTINDASIN');
    await expect(page.locator('#surveillance-eye')).toBeVisible();
    await expect(page.locator('#command-hint')).toHaveText('KOMUT İPUCU: YARDIM, BILGI, BILET, IZIN, CIKIS');
    await page.waitForTimeout(300);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('status bar identifies the citizen and the clock strikes thirteen', async ({ page }) => {
    await boot(page);
    await expect(page.locator('#citizen-id')).toHaveText(/^\d{4}-[A-Z]$/);
    await expect(page.locator('#visit-count')).toHaveText('1');
    await expect(page.locator('#clock')).toHaveText(/^13:\d{2}:\d{2}$/);
    await expect(page.locator('#status-value')).toHaveText('BEKLEMEDE');
    await expect(page.locator('#build-stamp')).toContainText('DERLEME DEV');
  });

  test('ticker carries ministry announcements and the recording light is on', async ({ page }) => {
    await boot(page);
    await expect(page.locator('#ticker-track')).toContainText('ÇİKOLATA TAYINI 30 GRAMA');
    await expect(page.locator('.rec-dot')).toBeVisible();
  });

  test('history starts empty and is itself recorded', async ({ page }) => {
    await boot(page);
    await expect(page.locator('#history-list li')).toHaveText(['Henüz komut girilmedi. Bu da kaydedildi.']);
  });

  test('on-screen keyboard is hidden until the screen is clicked', async ({ page }) => {
    await boot(page);
    await expect(page.locator('#keyboard')).toHaveAttribute('aria-hidden', 'true');
    await page.locator('#main-content').click({ position: { x: 40, y: 200 } });
    await expect(page.locator('#keyboard')).toHaveClass(/visible/);
    await expect(page.locator('#keyboard .key').first()).toHaveAttribute('tabindex', '0');
    await page.keyboard.press('Escape');
    await expect(page.locator('#keyboard')).not.toHaveClass(/visible/);
  });

  test('service worker, manifest and 404 page are served', async ({ page, request }) => {
    const sw = await request.get('/sw.js');
    expect(sw.ok()).toBeTruthy();
    expect(await sw.text()).toContain("addEventListener('fetch'");
    const manifest = await request.get('/manifest.webmanifest');
    expect(manifest.ok()).toBeTruthy();
    const json = await manifest.json();
    expect(json.start_url).toBe('./');
    expect(json.icons.length).toBeGreaterThanOrEqual(3);
    const missing = await request.get('/this-page-never-existed');
    expect(missing.status()).toBe(404);
    expect(await missing.text()).toContain('İSTEDİĞİNİZ SAYFA MEVCUT DEĞİL');
    await page.goto('/404.html');
    await expect(page.locator('h1')).toHaveText('İSTEDİĞİNİZ SAYFA MEVCUT DEĞİL.');
  });
});
