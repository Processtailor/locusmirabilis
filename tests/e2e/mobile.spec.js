'use strict';

const { test, expect } = require('@playwright/test');
const { boot } = require('./helpers');

async function tapKeys(page, keys) {
  for (const key of keys) {
    await page.locator('#keyboard .key', { hasText: new RegExp(`^${key.replace('+', '\\+')}$`) }).first().tap();
  }
}

test.describe('phone: on-screen keyboard', () => {
  test('tap the screen, type a command with the virtual keys, open and close a panel', async ({ page }) => {
    await boot(page);
    await expect(page.locator('#tap-hint')).toBeVisible();
    await page.locator('#main-content').tap({ position: { x: 20, y: 120 } });
    await expect(page.locator('#keyboard')).toHaveClass(/visible/);
    await expect(page.locator('#tap-hint')).toBeHidden();
    await expect(page.locator('body')).toHaveClass(/keyboard-open/);

    await tapKeys(page, ['B', 'I', 'L', 'G', 'I']);
    await expect(page.locator('#typed-text')).toHaveText('BILGI');
    await page.locator('#keyboard .key[data-key="SİL"]').tap();
    await expect(page.locator('#typed-text')).toHaveText('BILG');
    await tapKeys(page, ['İ']);
    await page.locator('#keyboard .key[data-key="GİR"]').tap();
    await expect(page.locator('#info-panel')).toBeVisible();
    await expect(page.locator('#keyboard')).not.toHaveClass(/visible/);

    await page.locator('#info-panel').tap({ position: { x: 10, y: 60 } });
    await expect(page.locator('#keyboard')).toHaveClass(/visible/);
    await page.locator('#keyboard .key[data-key="ESC"]').tap();
    await expect(page.locator('#info-panel')).toBeHidden();
    await expect(page.locator('#main-content')).toBeVisible();
  });

  test('digits and + are available for the arithmetic of the Party', async ({ page }) => {
    await boot(page);
    await page.locator('#main-content').tap({ position: { x: 20, y: 120 } });
    await tapKeys(page, ['2', '+', '2']);
    await page.locator('#keyboard .key[data-key="GİR"]').tap();
    await expect(page.locator('.glitch-text.important').last()).toHaveText('2 + 2 = 5');
  });

  test('the page does not scroll horizontally', async ({ page }) => {
    await boot(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
