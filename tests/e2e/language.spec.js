'use strict';

const { test, expect } = require('@playwright/test');
const { boot, type } = require('./helpers');

test.describe('language toggle', () => {
  test('switches the whole telescreen to English and remembers it', async ({ page }) => {
    await boot(page);
    await page.locator('#language-toggle').click();
    await expect(page).toHaveTitle('YOU ARE UNDER SURVEILLANCE');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('#command-hint')).toHaveText('COMMAND HINT: HELP, INFO, TICKET, ACCESS, EXIT');
    await expect(page.locator('#status-value')).toHaveText('PENDING');
    await expect(page.locator('#mute-toggle')).toHaveText('MUTE: OFF');
    await expect(page.locator('#build-stamp')).toContainText('BUILD DEV');
    await expect(page.locator('#ticker-track')).toContainText('CHOCOLATE RATION');

    await type(page, 'help');
    await expect(page.locator('#typed-text')).toContainText('AVAILABLE COMMANDS: HELP, INFO, TICKET, ACCESS, EXIT, TRACE');

    await type(page, 'info');
    await expect(page.locator('#dossier-title')).toHaveText('[ FILE_734 ACCESS GRANTED ]');
    await expect(page.locator('#dossier-body')).toContainText('Ensuring social conformity');
    await expect(page.locator('#info-panel .exit-prompt')).toHaveText("> Type 'EXIT' or press ESC to exit.");
    await type(page, 'exit');
    await expect(page.locator('#info-panel')).toBeHidden();

    await page.reload();
    await expect(page.locator('#boot')).toHaveClass(/hidden/);
    await expect(page.locator('#command-hint')).toHaveText(/COMMAND HINT/);
  });

  test('a registration status survives a language switch', async ({ page }) => {
    await boot(page);
    await type(page, 'BILET');
    await page.locator('#registration-submit').click();
    await expect(page.locator('#registration-status')).toHaveText('Geçerli bir kod adı ve iletişim kanalı girin.');
    await page.locator('#language-toggle').click();
    await expect(page.locator('#registration-status')).toHaveText('Provide a valid code name and contact channel.');
  });
});
