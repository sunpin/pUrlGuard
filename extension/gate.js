const title = document.querySelector('#title');
const message = document.querySelector('#message');
document.querySelector('#close').addEventListener('click', async () => { const tab = await chrome.tabs.getCurrent(); if (tab?.id !== undefined) await chrome.tabs.remove(tab.id); });
try {
  const result = await chrome.runtime.sendMessage({ type: 'check', url: location.hash.slice(1) });
  if (!result || result.error) throw Error('Check failed');
  if (!result.blocked) location.replace(result.url);
  else {
    title.textContent = 'このURLをブロックしました';
    message.textContent = 'ドメインにキリル文字が含まれています。見た目が似た文字による偽装を避けるため、接続を止めました。';
    document.querySelector('#unicode').textContent = result.unicode;
    document.querySelector('#ascii').textContent = result.hostname;
    document.querySelector('#details').hidden = false;
  }
} catch {
  title.textContent = '安全に確認できないため停止しました';
  message.textContent = 'URLまたは拡張機能の状態を確認してください。';
}
