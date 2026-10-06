'use strict';

const { test, expect } = require('@playwright/test');
const { boot, type } = require('./helpers');

test.describe('ERİŞİM İZNİ_217 registration', () => {
  test('validates each field, then processes the application through the bureaucracy', async ({ page }) => {
    await boot(page);
    await type(page, 'BILET');
    const status = page.locator('#registration-status');

    await page.locator('#registration-submit').click();
    await expect(status).toHaveText('Geçerli bir kod adı ve iletişim kanalı girin.');
    await expect(page.locator('#reg-name')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#reg-name')).toBeFocused();

    await page.locator('#reg-name').fill('WINSTON');
    await page.locator('#reg-contact').fill('not-an-email');
    await page.locator('#registration-submit').click();
    await expect(page.locator('#reg-contact')).toHaveAttribute('aria-invalid', 'true');

    await page.locator('#reg-contact').fill('winston@minitrue.gov');
    await page.locator('#registration-submit').click();
    await expect(status).toHaveText('Gerçekliği kabul etmeden devam edemezsiniz.');
    await expect(page.locator('#reg-consent')).toBeFocused();

    await page.locator('#reg-consent').check();
    await page.locator('#registration-submit').click();
    await expect(status).toHaveText(/KAYIT ALINDI\. KAYIT NO: LM-\d{4}[A-Z]-\d{4}\. SİSTEM SİZİ İZLİYOR\./);
    await expect(page.locator('#receipt')).toBeVisible();
    await expect(page.locator('#receipt')).toContainText('MAKBUZ');
    await expect(page.locator('#receipt')).toContainText('Bu makbuz hiçbir hak doğurmaz.');
    await expect(page.locator('.glitch-text.important').last()).toHaveText('KAYIT: WINSTON');
    await expect(page.locator('#reg-name')).toHaveValue('');
  });

  test('registration persists, shows up in the dossier, and cannot be repeated unnoticed', async ({ page }) => {
    await boot(page);
    await type(page, 'BILET');
    await page.locator('#reg-name').fill('JULIA');
    await page.locator('#reg-contact').fill('julia@fiction.dept');
    await page.locator('#reg-consent').check();
    await page.locator('#registration-submit').click();
    const status = page.locator('#registration-status');
    await expect(status).toContainText('KAYIT ALINDI');
    const code = (await status.textContent()).match(/LM-\d{4}[A-Z]-\d{4}/)[0];

    await page.reload();
    await expect(page.locator('#boot')).toHaveClass(/hidden/);
    await expect(page.locator('#ticket-panel')).toBeVisible();          // last panel restored
    await expect(page.locator('#receipt')).toContainText(code);
    await page.locator('#reg-name').fill('JULIA');
    await page.locator('#reg-contact').fill('julia@fiction.dept');
    await page.locator('#reg-consent').check();
    await page.locator('#registration-submit').click();
    await expect(status).toContainText(`ZATEN KAYITLISINIZ`);
    await expect(status).toContainText(code);

    await page.keyboard.press('Escape');
    await type(page, 'BILGI');
    await expect(page.locator('#annex-list')).toContainText(code);
  });

  test('no network request ever carries the form data', async ({ page }) => {
    const requests = [];
    page.on('request', (req) => requests.push(req));
    await boot(page);
    await type(page, 'BILET');
    await page.locator('#reg-name').fill('OBRIEN');
    await page.locator('#reg-contact').fill('obrien@miniluv.gov');
    await page.locator('#reg-consent').check();
    await page.locator('#registration-submit').click();
    await expect(page.locator('#registration-status')).toContainText('KAYIT ALINDI');
    const leaks = requests.filter((req) => /OBRIEN|miniluv/i.test(req.url()) || /OBRIEN|miniluv/i.test(req.postData() || ''));
    expect(leaks).toEqual([]);
  });
});
