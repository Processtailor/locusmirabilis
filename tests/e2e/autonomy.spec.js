'use strict';

const { test, expect } = require('@playwright/test');
const { boot, type } = require('./helpers');

test.describe('the system acts on its own', () => {
  test('boot sequence types itself out and can be skipped', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'no-preference' });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('#boot')).toBeVisible();
    await expect(page.locator('#boot-lines .boot-line').first()).toContainText('TELEKRAN v13.0', { timeout: 5000 });
    await expect(page.locator('#boot-skip')).toContainText('ATLAMAK İÇİN');
    await page.keyboard.press('Enter');
    await expect(page.locator('#boot')).toHaveClass(/hidden/, { timeout: 5000 });
    await expect(page.locator('#boot-lines .boot-line.title')).toHaveText('GÖZETİM ALTINDASIN');
    await expect(page.locator('#surveillance-eye')).toBeVisible();
    await context.close();
  });

  test('boot finishes on its own within a few seconds', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'no-preference' });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('#boot')).toHaveClass(/hidden/, { timeout: 12000 });
    await context.close();
  });

  test('returning citizens are recognised', async ({ page }) => {
    await boot(page);
    await page.reload();
    await expect(page.locator('#boot')).toHaveClass(/hidden/);
    await expect(page.locator('#visit-count')).toHaveText('2');
    await expect(page.locator('#boot-lines')).toContainText('ZİYARET 2. GİTMEDİĞİNİZİ BİLİYORDUK.');
  });

  test('the dossier access window expires', async ({ page }) => {
    await boot(page, 'lm_access=5');
    await type(page, 'BILGI');
    await expect(page.locator('#access-value')).toHaveText('00:05');
    await expect(page.locator('#info-panel')).toBeHidden({ timeout: 9000 });
    await expect(page.locator('.glitch-text.important').last()).toHaveText('ERİŞİM SÜRESİ DOLDU.');
  });

  test('the prompt types by itself when you go quiet', async ({ page }) => {
    await boot(page, 'lm_idle=3000');
    await expect(page.locator('#typed-text')).toHaveClass(/system/, { timeout: 9000 });
    await expect(page.locator('#typed-text')).not.toBeEmpty();
    await page.keyboard.type('Y');
    await expect(page.locator('#typed-text')).not.toHaveClass(/system/);
    await expect(page.locator('#typed-text')).toHaveText('Y');
  });

  test('the eye follows the pointer', async ({ page }) => {
    await boot(page);
    await page.mouse.move(10, 10);
    const left = await page.locator('#pupil').evaluate((node) => node.style.transform);
    await page.mouse.move(1200, 700);
    await expect.poll(() => page.locator('#pupil').evaluate((node) => node.style.transform)).not.toBe(left);
    expect(left).toMatch(/translate\(-/);
  });

  test('leaving the tab is noticed', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page).toHaveTitle('GERİ DÖN.');
    await page.waitForTimeout(3200);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page).toHaveTitle('GÖZETİM ALTINDASIN');
    await expect(page.locator('.glitch-text.important').last()).toHaveText('NEREDEYDİN?');
  });
});
