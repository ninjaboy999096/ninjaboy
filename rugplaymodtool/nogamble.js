// this is made by ai!
(() => {
  function removeCoinflipCard() {
    document.querySelectorAll('div[data-slot="card"]').forEach(card => {
      const title = card.querySelector('[data-slot="card-title"]');
      if (title && title.textContent.trim() === "Coinflip") {
        card.remove();
      }
    });
  }

  function removeGameSelectorRow() {
    document.querySelectorAll('div.flex.justify-center.gap-4').forEach(row => {
      const buttons = [...row.querySelectorAll('button')]
        .map(b => b.textContent.trim());

      // Match the Coinflip / Slots / Mines / Dice row
      const targets = ["Coinflip", "Slots", "Mines", "Dice"];
      if (targets.every(t => buttons.includes(t))) {
        row.remove();
      }
    });
  }

  function run() {
    removeCoinflipCard();
    removeGameSelectorRow();
  }

  // Initial run
  run();

  // Handle SPA rerenders
  const observer = new MutationObserver(run);
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
