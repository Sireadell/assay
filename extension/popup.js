const input = document.getElementById('seller');
const msg = document.getElementById('msg');
chrome.storage.sync.get('seller').then(({ seller }) => { if (seller) input.value = seller; });
document.getElementById('save').addEventListener('click', async () => {
  const v = input.value.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(v)) { msg.textContent = 'That is not an Arc address. It starts with 0x and is 42 characters long.'; return; }
  await chrome.storage.sync.set({ seller: v });
  msg.textContent = 'Saved. Open a payment on explorer.arc.io to see the badge.';
});
