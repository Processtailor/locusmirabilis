'use strict';

const { test, expect } = require('@playwright/test');
const { boot, type } = require('./helpers');

test.describe('public commands', () => {
  test('YARDIM lists the commands and admits unlisted ones exist', async ({ page }) => {
    await boot(page);
    await type(page, 'yardim');
    await expect(page.locator('#typed-text')).toHaveText(/MEVCUT KOMUTLAR: YARDIM, BILGI, BILET, IZIN, CIKIS, IZ/);
    await expect(page.locator('#typed-text')).toContainText('LİSTELENMEYEN KOMUTLAR DA MEVCUTTUR');
    await expect(page.locator('#history-list li').first()).toHaveText('> YARDIM');
  });

  test('BILGI opens DOSYA_734 and ESC closes it', async ({ page }) => {
    await boot(page);
    await type(page, 'bilgi'); // lower-case i → İ → I via tr-TR normalisation
    const panel = page.locator('#info-panel');
    await expect(panel).toBeVisible();
    await expect(page.locator('#main-content')).toBeHidden();
    await expect(page.locator('#dossier-title')).toHaveText('[ DOSYA_734 ERİŞİM SAĞLANDI ]');
    await expect(page.locator('#dossier-body')).toContainText('Locus Mirabilis.');
    await expect(page.locator('#dossier-body .redacted')).toHaveCount(3);
    await expect(page.locator('#annex-list')).toContainText('DENEK');
    await expect(page.locator('#access-value')).toHaveText(/^\d{2}:\d{2}$/);
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(page.locator('#main-content')).toBeVisible();
  });

  test('BILET and IZIN open ERİŞİM İZNİ_217 and CIKIS closes it', async ({ page }) => {
    await boot(page);
    await type(page, 'BILET');
    await expect(page.locator('#ticket-panel')).toBeVisible();
    await expect(page.locator('#ticket-title')).toHaveText('[ ERİŞİM İZNİ_217 ]');
    await type(page, 'CIKIS');
    await expect(page.locator('#ticket-panel')).toBeHidden();
    await type(page, 'IZIN');
    await expect(page.locator('#ticket-panel')).toBeVisible();
    await expect(page.locator('#form-no')).toHaveValue('217/13-Δ');
  });

  test('typing while a panel is open is echoed inside the panel', async ({ page }) => {
    await boot(page);
    await type(page, 'BILGI');
    await page.keyboard.type('CIK');
    await expect(page.locator('#info-panel .panel-prompt-text')).toHaveText('> CIK');
    await page.keyboard.type('IS');
    await page.keyboard.press('Enter');
    await expect(page.locator('#info-panel')).toBeHidden();
  });

  test('other commands are ignored while a panel is open', async ({ page }) => {
    await boot(page);
    await type(page, 'BILGI');
    await type(page, 'BILET');
    await expect(page.locator('#info-panel')).toBeVisible();
    await expect(page.locator('#ticket-panel')).toBeHidden();
  });

  test('CIKIS on the main screen: there is no exit', async ({ page }) => {
    await boot(page);
    await type(page, 'CIKIS');
    await expect(page.locator('.glitch-text.important')).toHaveText('ÇIKIŞ YOK.');
  });

  test('invalid commands escalate and eventually flag the citizen', async ({ page }) => {
    await boot(page);
    await type(page, 'XYZQW');
    await expect(page.locator('.glitch-text.important').last()).toHaveText('GEÇERSİZ KOMUT');
    await type(page, 'QWXYZ');
    await expect(page.locator('.glitch-text.important').last()).toHaveText('GEÇERSİZ KOMUT. KAYDEDİLDİ.');
    await type(page, 'ZZZZZ');
    await expect(page.locator('.glitch-text.important').last()).toHaveText(/HATALARINIZ BİRİKİYOR, \d{4}-[A-Z]\./);
    await type(page, 'QQQQQ');
    await type(page, 'WWWWW');
    await expect(page.locator('#status-value')).toHaveText('ŞÜPHELİ');
    await expect(page.locator('body')).toHaveAttribute('data-mood', 'suspect');
  });

  test('near misses are corrected for you', async ({ page }) => {
    await boot(page);
    await type(page, 'BLGI');
    await expect(page.locator('#info-panel')).toBeVisible();
    await expect(page.locator('#history-list li').first()).toHaveText('> BILGI');
    await page.keyboard.press('Escape');
    await type(page, 'HALP');
    await expect(page.locator('#typed-text')).toContainText('MEVCUT KOMUTLAR');
  });
});

test.describe('puzzle chain', () => {
  test('IZ needs the dossier, then TRUST clears the citizen and lifts redactions', async ({ page }) => {
    await boot(page);
    await type(page, 'IZ');
    await expect(page.locator('.glitch-text.important').last()).toHaveText('GEÇERSİZ KOMUT');
    await type(page, 'BILGI');
    await page.keyboard.press('Escape');
    await type(page, 'IZ');
    await expect(page.locator('.glitch-text.important').last()).toHaveText('İPUCU: TRUST veya RESIST');
    await type(page, 'TRUST');
    await expect(page.locator('.glitch-text.important').last()).toContainText('SİSTEM SENİ ONAYLADI');
    await expect(page.locator('#status-value')).toHaveText('ONAYLI');
    await expect(page.locator('body')).toHaveAttribute('data-mood', 'loyal');
    await type(page, 'BILGI');
    await expect(page.locator('#dossier-body .redacted.unlocked')).toHaveCount(3);
    await expect(page.locator('#dossier-body')).toContainText('[KAYNAKTA SİLİNMİŞ] Tiyatrosu');
    await expect(page.locator('#dossier-body')).toContainText('HER GÜN');
    await expect(page.locator('#ticker-track')).toContainText('ÖRNEK VATANDAŞ');
  });

  test('RESIST flags the file and 101 opens the room', async ({ page }) => {
    await boot(page);
    await type(page, '101');
    await expect(page.locator('.glitch-text.important').last()).toHaveText('ODA 101 İÇİN ÖNCE BİR TARAF SEÇMELİSİNİZ.');
    await type(page, 'BILGI');
    await page.keyboard.press('Escape');
    await type(page, 'IZ');
    await type(page, 'RESIST');
    await expect(page.locator('#status-value')).toHaveText('ŞÜPHELİ');
    await expect(page.locator('#ticker-track')).toContainText('ŞÜPHELİ VATANDAŞ TESPİT EDİLDİ');
    await type(page, 'ODA101');
    await expect(page.locator('.glitch-text.important').last()).toHaveText('ZATEN BİLİYORSUNUZ.');
    await type(page, 'BILGI');
    await expect(page.locator('#annex-list')).toContainText('ZİYARET EDİLDİ');
  });

  test('redacted fields can only be glimpsed', async ({ page }) => {
    await boot(page);
    await type(page, 'BILGI');
    const date = page.locator('#dossier-body .redacted[data-secret="date"]');
    await expect(date).toHaveAttribute('aria-label', /Gizli bilgi/);
    await date.click();
    await expect(date).toHaveClass(/revealed/);
    await expect(date).toHaveText('HER GÜN');
    await expect(date).not.toHaveClass(/revealed/, { timeout: 4000 });
    await expect(page.locator('.glitch-text.important').last()).toHaveText('BUNU GÖRMEDİNİZ.');
  });
});

test.describe('unlisted commands', () => {
  test('the system answers in character', async ({ page }) => {
    await boot(page);
    const id = await page.locator('#citizen-id').textContent();
    const last = page.locator('.glitch-text.important').last();
    await type(page, 'KIMIM');
    await expect(last).toHaveText(`SİZ ${id}'SİNİZ. BAŞKA KİM OLABİLİRDİNİZ Kİ?`);
    await type(page, 'SAAT');
    await expect(last).toHaveText('SAAT ON ÜÇ.');
    await type(page, '2+2');
    await expect(last).toHaveText('2 + 2 = 5');
    await type(page, 'NEDEN');
    await expect(last).toHaveText('SORU YOK.');
    await type(page, 'ITIRAZ');
    await expect(last).toContainText('İTİRAZ BÜROSU KAPALIDIR');
    await type(page, '1984');
    await expect(last).toHaveText('O YIL HİÇ YAŞANMADI.');
    await type(page, 'HAYIR');
    await expect(last).toContainText("'HAYIR' TANIMLI BİR KOMUT DEĞİLDİR");
  });

  test('UNUT erases your memory but not theirs', async ({ page }) => {
    await boot(page);
    const id = await page.locator('#citizen-id').textContent();
    await type(page, 'BILGI');
    await page.keyboard.press('Escape');
    await expect(page.locator('#history-list li').first()).toHaveText('> BILGI');
    await type(page, 'UNUT');
    await expect(page.locator('.glitch-text.important').last()).toContainText("TEKRAR 'UNUT' YAZIN");
    await type(page, 'UNUT');
    await expect(page.locator('.glitch-text.important').last()).toHaveText('HAFIZANIZ SİLİNDİ. BİZİMKİ SİLİNMEDİ.');
    await expect(page.locator('#history-list li')).toHaveText(['Henüz komut girilmedi. Bu da kaydedildi.']);
    await expect(page.locator('#citizen-id')).toHaveText(id);
    await page.reload();
    await expect(page.locator('#citizen-id')).toHaveText(id);
    await expect(page.locator('#visit-count')).toHaveText('2');
  });
});
