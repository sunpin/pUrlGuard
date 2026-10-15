import { inspectUrl, exactHostRegex } from './domain.js';
// One safe hostname per tab; serialization prevents concurrent rule update races.
let pending = Promise.resolve();
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message?.type !== 'check') return;
  pending = pending.catch(() => {}).then(async () => {
    if (sender.id !== chrome.runtime.id || sender.url?.split('#')[0] !== chrome.runtime.getURL('gate.html') || !Number.isInteger(sender.tab?.id)) throw Error('Invalid sender');
    const result = inspectUrl(message.url);
    if (result.blocked) return { blocked: true, hostname: result.url.hostname, unicode: result.unicode };
    const id = sender.tab.id + 1;
    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [id], addRules: [{ id, priority: 10, action: { type: 'allow' }, condition: { tabIds: [sender.tab.id], regexFilter: exactHostRegex(result.url.hostname), resourceTypes: ['main_frame'] } }] });
    return { blocked: false, url: result.url.href };
  });
  pending.then(reply, () => reply({ error: true }));
  return true;
});
chrome.tabs.onRemoved.addListener(tabId => {
  pending = pending.catch(() => {}).then(() => chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [tabId + 1] }));
});
