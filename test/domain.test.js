import test from 'node:test';
import assert from 'node:assert/strict';
import { domainToUnicode } from 'node:url';
import { readFileSync } from 'node:fs';
import { inspectUrl, exactHostRegex } from '../extension/domain.js';
const rule = JSON.parse(readFileSync(new URL('../extension/rules.json', import.meta.url)))[0];
const gate = new RegExp(rule.condition.regexFilter, 'i');
for (const host of ['пример.рф','аpple.com','example.рф','sub.пример.com','я.example.com','ӏ.com','ꙋ.com','\u{1e030}.com']) {
  test(`blocks ${host}`, () => {
    const url = new URL(`https://${host}/path?q=a#fragment`);
    assert.equal(gate.test(url.href), true);
    const result = inspectUrl(url.href);
    assert.equal(result.blocked, true);
    assert.equal(result.unicode, domainToUnicode(url.hostname));
  });
}
for (const host of ['example.com','日本語.jp','例え.テスト','münchen.de','παράδειγμα.gr','한국.kr','中文.com','😀.com']) {
  test(`allows ${host}`, () => {
    const url = new URL(`https://${host}/`);
    const result = inspectUrl(url.href);
    assert.equal(result.blocked, false);
    assert.equal(result.unicode, domainToUnicode(url.hostname));
    const allow = new RegExp(exactHostRegex(url.hostname));
    assert.equal(allow.test(url.href), true);
    assert.equal(allow.test(`https://evil.${url.hostname}/`), false);
    assert.equal(allow.test(`https://${url.hostname}.evil.test/`), false);
  });
}
test('only hostname is checked', () => {
  assert.equal(gate.test('https://example.com/xn--p1ai?next=https://xn--p1ai/'), false);
  assert.equal(inspectUrl('https://example.com/пример?q=рф').blocked, false);
});
test('credentials cannot bypass gate', () => {
  const url = new URL('https://user:pass@пример.рф/');
  assert.equal(gate.test(url.href), true);
  assert.throws(() => inspectUrl(url.href));
});
test('safe allow is exact even with port or trailing dot', () => {
  const allow = new RegExp(exactHostRegex('xn--wgv71a.jp.'));
  assert.equal(allow.test('https://xn--wgv71a.jp.:8080/'), true);
  assert.equal(allow.test('https://xn--wgv71a.jp.evil/'), false);
});
test('unsupported URLs fail closed', () => {
  for (const url of ['javascript:alert(1)','file:///tmp/a','nonsense','https://xn--/']) assert.throws(() => inspectUrl(url));
});
