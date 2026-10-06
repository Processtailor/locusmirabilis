'use strict';

const { expect } = require('@playwright/test');

/**
 * Open the telescreen. `lm_fast=1` skips typewriters and bureaucratic delays
 * so command flows can be asserted deterministically.
 */
async function boot(page, query = '') {
  const errors = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error' || /Content Security Policy/i.test(text)) errors.push(`console: ${text}`);
  });
  await page.goto(`/?lm_fast=1${query ? `&${query}` : ''}`);
  await expect(page.locator('#boot')).toHaveClass(/hidden/);
  return errors;
}

async function type(page, command) {
  await page.keyboard.type(command, { delay: 5 });
  await page.keyboard.press('Enter');
}

module.exports = { boot, type };
