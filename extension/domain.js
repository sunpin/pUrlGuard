// RFC 3492 decoder. No remote dependencies or network lookups.
export function decodeLabel(label) {
  if (!label.toLowerCase().startsWith('xn--')) return label;
  const input = label.slice(4).toLowerCase();
  let n = 128, i = 0, bias = 72, pos = 0;
  const out = [];
  const delimiter = input.lastIndexOf('-');
  if (delimiter >= 0) { for (const c of input.slice(0, delimiter)) out.push(c.codePointAt(0)); pos = delimiter + 1; }
  while (pos < input.length) {
    const old = i;
    let weight = 1;
    for (let k = 36; ; k += 36) {
      if (pos >= input.length) throw Error('Invalid Punycode');
      const c = input.charCodeAt(pos++);
      const digit = c >= 97 && c <= 122 ? c - 97 : c >= 48 && c <= 57 ? c - 22 : 36;
      if (digit >= 36) throw Error('Invalid Punycode');
      i += digit * weight;
      if (!Number.isSafeInteger(i)) throw Error('Punycode overflow');
      const t = k <= bias ? 1 : k >= bias + 26 ? 26 : k - bias;
      if (digit < t) break;
      weight *= 36 - t;
      if (!Number.isSafeInteger(weight)) throw Error('Punycode overflow');
    }
    let delta = Math.floor((i - old) / (old === 0 ? 700 : 2));
    delta += Math.floor(delta / (out.length + 1));
    let k = 0;
    while (delta > 455) { delta = Math.floor(delta / 35); k += 36; }
    bias = k + Math.floor(36 * delta / (delta + 38));
    n += Math.floor(i / (out.length + 1));
    i %= out.length + 1;
    if (n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff)) throw Error('Invalid code point');
    out.splice(i++, 0, n);
  }
  if (!out.length) throw Error('Empty Punycode');
  return String.fromCodePoint(...out);
}
export function inspectUrl(raw) {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw Error('Unsupported URL');
  const unicode = url.hostname.split('.').map(decodeLabel).join('.');
  return { url, unicode, blocked: /\p{Script_Extensions=Cyrillic}/u.test(unicode) };
}
export function exactHostRegex(hostname) {
  return '^https?://' + hostname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(:[0-9]+)?/';
}
