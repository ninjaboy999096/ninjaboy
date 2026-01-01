(function () {
  if (window.__buyThenSellInjected) return;
  window.__buyThenSellInjected = true;

  const DELAY_MS = 60_000;

  function getDialog() {
    return document.querySelector('[data-dialog-content]');
  }

  function getCoinSymbol(dialog) {
    const title = dialog.querySelector('[data-dialog-title]');
    if (!title) return null;

    // "Buy TESTCOIN12" → TESTCOIN12
    const match = title.textContent.match(/Buy\s+([A-Z0-9_-]+)/i);
    return match ? match[1] : null;
  }

  function getAmount(dialog) {
    const input = dialog.querySelector('input#amount');
    if (!input) return null;
    const val = Number(input.value);
    return Number.isFinite(val) && val > 0 ? val : null;
  }

  function apiTrade(coin, type, amount) {
    return fetch(`/api/coin/${coin}/trade`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "accept": "*/*"
      },
      body: JSON.stringify({ type, amount })
    }).then(r => r.json());
  }

  function insertStatus(dialog) {
    let status = dialog.querySelector('#buy-sell-status');
    if (status) return status;

    status = document.createElement('div');
    status.id = 'buy-sell-status';
    status.className = 'text-xs text-muted-foreground';
    status.textContent = 'Idle';

    dialog.querySelector('[data-slot="dialog-footer"]')
      .prepend(status);

    return status;
  }

  function insertButton(dialog) {
    if (dialog.querySelector('#buy-sell-btn')) return;

    const footer = dialog.querySelector('[data-slot="dialog-footer"]');
    if (!footer) return;

    const btn = document.createElement('button');
    btn.id = 'buy-sell-btn';
    btn.type = 'button';
    btn.textContent = 'Buy then Sell (60s)';
    btn.className =
      'inline-flex shrink-0 items-center justify-center gap-2 ' +
      'rounded-md text-sm font-medium h-9 px-4 py-2 ' +
      'bg-background border shadow-xs hover:bg-accent';

    const status = insertStatus(dialog);

    btn.onclick = async () => {
      const coin = getCoinSymbol(dialog);
      const amount = getAmount(dialog);

      if (!coin) {
        status.textContent = 'Could not detect coin';
        return;
      }
      if (!amount) {
        status.textContent = 'Enter amount first';
        return;
      }

      status.textContent = `Buying ${coin}…`;

      const buy = await apiTrade(coin, "BUY", amount);
      if (!buy?.success) {
        status.textContent = 'BUY failed';
        return;
      }

      const bought = buy.coinsBought ?? amount;
      status.textContent = `Bought. Selling in 60s…`;

      setTimeout(async () => {
        status.textContent = 'Selling…';

        const sell = await apiTrade(coin, "SELL", bought);
        if (!sell?.success) {
          status.textContent = 'SELL failed';
          return;
        }

        status.textContent = 'Done ✅';
      }, DELAY_MS);
    };

    footer.prepend(btn);
  }

  // Watch for dialog opening
  const observer = new MutationObserver(() => {
    const dialog = getDialog();
    if (dialog) insertButton(dialog);
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
