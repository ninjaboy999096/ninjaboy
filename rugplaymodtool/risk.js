// this script is made by ai
(() => {
  if (window.__COIN_RISK__) return;
  window.__COIN_RISK__ = true;

  function calculateRisk(owner, holders) {
    let points = 0;
    const reasons = [];

    // Owner check
    if (owner.pct <= 20) { points -= 4; reasons.push(`Owner owns ${owner.pct}% → -4 pts`); }
    else if (owner.pct <= 40) { points -= 2; reasons.push(`Owner owns ${owner.pct}% → -2 pts`); }
    else if (owner.pct <= 60) { points += 0; reasons.push(`Owner owns ${owner.pct}% → 0 pts`); }
    else if (owner.pct <= 80) { points += 5; reasons.push(`Owner owns ${owner.pct}% → +5 pts`); }
    else if (owner.pct <= 100) { points += 10; reasons.push(`Owner owns ${owner.pct}% → +10 pts`); }

    // Top 3 holders (skipping owner)
    holders.slice(0, 3).forEach((h, i) => {
      if (h.name === owner.name) return;
      if (h.pct <= 20) { points -= 0.5; reasons.push(`Top holder #${i+1} owns ${h.pct}% → -0.5 pts`); }
      else if (h.pct <= 40) { points -= 0.25; reasons.push(`Top holder #${i+1} owns ${h.pct}% → -0.25 pts`); }
      else if (h.pct <= 60) { points += 0; reasons.push(`Top holder #${i+1} owns ${h.pct}% → 0 pts`); }
      else if (h.pct <= 80) { points += 2.5; reasons.push(`Top holder #${i+1} owns ${h.pct}% → +2.5 pts`); }
      else if (h.pct <= 100) { points += 5; reasons.push(`Top holder #${i+1} owns ${h.pct}% → +5 pts`); }
    });

    // Imbalance
    const topPct = holders[0]?.pct || 0;
    const thirdPct = holders[2]?.pct || 0;
    if (topPct - thirdPct > 80) {
      reasons.push("Massive imbalance: owner dominates supply → good signals discarded");
      points = Math.max(points, 0);
    }

    // Risk level
    let level = points >= 6 ? "RISKY" : points >= 4 ? "PRETTY RISKY" : points >= 2 ? "LOW RISK" : "NO RISK";
    return { points, level, reasons };
  }

  function renderRisk(cardEl, owner, holders) {
    if (!cardEl) return;
    const content = cardEl.querySelector('[data-slot="card-content"] .space-y-3');
    if (!content || content.querySelector('[data-notallyhall]')) return;

    const { points, level, reasons } = calculateRisk(owner, holders);

    const box = document.createElement("div");
    box.setAttribute("data-notallyhall", "");
    box.style.cssText = `
      margin-bottom: 12px;
      padding: 12px;
      border-radius: 10px;
      background: rgb(15,15,20);
      color: rgb(234,234,240);
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      border: 1px solid rgb(42,42,53);
      user-select: text;
    `;
    box.innerHTML = `
      <div style="font-weight:600;font-size:14px;margin-bottom:6px;">Coin Risk Analysis</div>
      <div style="font-size:13px;opacity:.9;margin-bottom:6px;">Creator: ${owner.name} (@${owner.handle})</div>
      <div style="font-size:13px;margin-bottom:6px;">
        <b>Risk Points:</b> ${points}<br>
        <b>Risk Level:</b> ${level}
      </div>
      <div style="font-size:12px;opacity:.85;">
        <b>Reasons:</b>
        <ul style="margin:6px 0 0 16px;padding:0;">
          ${reasons.map(r => `<li>${r}</li>`).join("")}
        </ul>
      </div>
    `;

    const buyButton = content.querySelector('button');
    if (buyButton) content.insertBefore(box, buyButton);
    else content.appendChild(box);
  }

  // wait for the card to exist using MutationObserver
  const observer = new MutationObserver(() => {
    const card = document.querySelector('[data-slot="card"]');
    if (card) {
      observer.disconnect();
      const owner = { name: "AssassiN", handle: "assassin", pct: 100 };
      const topHolders = [
        { name: "AssassiN", pct: 100 },
        { name: "Stonks", pct: 0 },
        { name: "Alonso", pct: 0 },
      ];
      renderRisk(card, owner, topHolders);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
