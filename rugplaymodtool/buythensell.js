// this mod was made by ai
(function () {
  const style = document.createElement("style");
  style.textContent = `
    /* Stretch buy dialog instead of buttons */
    [data-dialog-content] {
      max-width: 640px !important;
      width: 100% !important;
    }

    /* Let footer wrap cleanly */
    [data-slot="dialog-footer"] {
      flex-wrap: wrap;
      gap: 8px;
    }

    /* Ensure custom controls stay inside */
    #bts-btn {
      white-space: nowrap;
    }
  `;
  document.head.appendChild(style);
})();

(function () {
  if (window.__buyThenSellInjected) return;
  window.__buyThenSellInjected = true;

  const DEFAULT_DELAY = 120; // seconds

  function getDialog() {
    return document.querySelector('[data-dialog-content]');
  }

  function getCoin(dialog) {
    const title = dialog.querySelector('[data-dialog-title]');
    if (!title) return null;
    const m = title.textContent.match(/Buy\s+([A-Z0-9_-]+)/i);
    return m ? m[1] : null;
  }

  function getAmount(dialog) {
    const input = dialog.querySelector('#amount');
    const v = Number(input?.value);
    return Number.isFinite(v) && v > 0 ? v : null;
  }

  function trade(coin, type, amount) {
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

  function ensureUI(dialog) {
    if (dialog.querySelector('#bts-btn')) return;

    const footer = dialog.querySelector('[data-slot="dialog-footer"]');
    if (!footer) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'flex items-center gap-2';

    // seconds input
    const secInput = document.createElement('input');
    secInput.type = 'number';
    secInput.min = '1';
    secInput.value = DEFAULT_DELAY;
    secInput.className =
      'border-input bg-background shadow-xs h-9 w-20 rounded-md border px-2 text-sm';
    secInput.title = 'Delay (seconds)';

    // button
    const btn = document.createElement('button');
    btn.id = 'bts-btn';
    btn.type = 'button';
    btn.textContent = 'Buy then Sell';
    btn.className =
      'inline-flex items-center justify-center rounded-md text-sm font-medium ' +
      'h-9 px-4 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90';

    // status text
    const status = document.createElement('div');
    status.className = 'text-xs text-muted-foreground';
    status.textContent = 'Idle';

    btn.onclick = async () => {
      const coin = getCoin(dialog);
      const amount = getAmount(dialog);
      const delay = Math.max(1, Number(secInput.value) || DEFAULT_DELAY);

      if (!coin) {
        status.textContent = 'Coin not detected';
        return;
      }
      if (!amount) {
        status.textContent = 'Enter amount';
        return;
      }

      status.textContent = `Buying ${coin}…`;
      const buy = await trade(coin, "BUY", amount);
      if (!buy?.success) {
        status.textContent = 'BUY failed';
        return;
      }

      const bought = buy.coinsBought ?? amount;
      status.textContent = `Selling in ${delay}s…`;

      setTimeout(async () => {
        status.textContent = 'Selling…';
        const sell = await trade(coin, "SELL", bought);
        status.textContent = sell?.success ? 'Done ✅' : 'SELL failed';
      }, delay * 1000);
    };

    wrapper.append(secInput, btn);
    footer.prepend(wrapper);
    footer.prepend(status);
  }

  const mo = new MutationObserver(() => {
    const dialog = getDialog();
    if (dialog) ensureUI(dialog);
  });

  mo.observe(document.body, { childList: true, subtree: true });
})();
