'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const I18N = require('../../assets/js/i18n.js');

const { TR, EN } = I18N;

function placeholders(value) {
  return Array.from(String(value).matchAll(/\{(\w+)\}/g)).map((m) => m[1]).sort();
}

function flatten(obj, prefix = '') {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flatten(value, name));
    } else {
      out[name] = value;
    }
  }
  return out;
}

test('both languages exist and are frozen', () => {
  assert.ok(TR && EN);
  assert.ok(Object.isFrozen(TR));
  assert.ok(Object.isFrozen(EN));
});

test('TR and EN expose exactly the same keys', () => {
  const trKeys = Object.keys(flatten(TR)).sort();
  const enKeys = Object.keys(flatten(EN)).sort();
  assert.deepEqual(enKeys, trKeys);
});

test('every value has the same shape in both languages', () => {
  const tr = flatten(TR);
  const en = flatten(EN);
  for (const key of Object.keys(tr)) {
    assert.equal(typeof en[key], typeof tr[key], `type mismatch for ${key}`);
    if (Array.isArray(tr[key])) {
      assert.ok(Array.isArray(en[key]), `${key} should be an array in EN`);
      assert.equal(en[key].length, tr[key].length, `array length mismatch for ${key}`);
    }
  }
});

test('no empty strings anywhere', () => {
  for (const [lang, table] of Object.entries(I18N)) {
    for (const [key, value] of Object.entries(flatten(table))) {
      const values = Array.isArray(value) ? value.flat(2) : [value];
      for (const v of values) {
        if (typeof v === 'string') assert.ok(v.trim().length > 0, `${lang}.${key} contains an empty string`);
      }
    }
  }
});

test('placeholders match between languages', () => {
  const tr = flatten(TR);
  const en = flatten(EN);
  for (const key of Object.keys(tr)) {
    const a = Array.isArray(tr[key]) ? tr[key].flat(2).join(' ') : tr[key];
    const b = Array.isArray(en[key]) ? en[key].flat(2).join(' ') : en[key];
    if (typeof a === 'string') {
      assert.deepEqual(placeholders(b), placeholders(a), `placeholder mismatch for ${key}`);
    }
  }
});

test('dossier secret tokens all have a definition', () => {
  for (const [lang, table] of Object.entries(I18N)) {
    const tokens = table.dossierRows.flatMap((row) => Array.from(row.v.matchAll(/\[\[(\w+)\]\]/g)).map((m) => m[1]));
    assert.ok(tokens.length >= 3, `${lang}: dossier should carry redacted fields`);
    for (const token of tokens) {
      assert.ok(table.secrets[token] && table.secrets[token].text, `${lang}: missing secret "${token}"`);
    }
  }
});

test('the hint lists exactly the public commands in the local language', () => {
  assert.match(TR.hint, /YARDIM, BILGI, BILET, IZIN, CIKIS/);
  assert.match(EN.hint, /HELP, INFO, TICKET, ACCESS, EXIT/);
  assert.match(TR.helpCommands, /\bIZ\b/);
  assert.match(EN.helpCommands, /\bTRACE\b/);
});
