// this script is made by ai
(() => {
  if (window.__COIN_RISK__) return;
  window.__COIN_RISK__ = true;

  function calculateRisk(owner, holders) {
    let points = 0;
    const reasons = [];

    // Owner points
    let ownerPoints = 0;
    if (owner.pct <= 20) ownerPoints = -4;
    else if (owner.pct <= 40) ownerPoints = -2;
    else if (owner.pct <= 60) ownerPoints = 0;
    else if (owner.pct <= 80) ownerPoints = 5;
    else ownerPoints = 10;
    reasons.push(`Owner owns ${owner.pct}% → +${ownerPoints} pts`);

    // Top 3 holders (reduced points)
    const holderPoints = [];
    holders.slice(0, 3).forEach((h, i) => {
      if (h.name === owner.name) {
        holderPoints.push(0);
        reasons.push(`Top holder #${i + 1} owns ${h.pct}% → 0 pts`);
        return;
      }
      let p = 0;
      if (h.pct <= 20) p = -0.5;
      else if (h.pct <= 40) p = -0.25;
      else if (h.pct <= 60) p = 0;
      else if (h.pct <= 80) p = 2.5;
      else p = 5;
      holderPoints.push(p);
      reasons.push(`Top holder #${i + 1} owns ${h.pct}% → ${p >= 0 ? "+" : ""}${p} pts`);
    });

    // Imbalance check: owner dominates → discard top holder contributions
    const thirdPct = holders[2]?.pct || 0;
    if (owner.pct - thirdPct > 80) {
      reasons.push("Massive imbalance: owner dominates supply → good signals discarded");
      for (let i = 0; i < holderPoints.length; i++) {
        if (holderPoints[i] < 0) holderPoints[i] = 0; // negative points become 0
      }
    }

    points = ownerPoints + holderPoints.reduce((a,b)=>a+b,0);
    const level = points >= 6 ? "RISKY" : points >= 4 ? "PRETTY RISKY" : points >= 2 ? "LOW RISK" : "NO RISK";
    return { points, level, reasons };
  }

  function renderRisk(buyBtn, owner, holders) {
    if (!buyBtn) return;
    const container = buyBtn.parentElement;
    if (!container || container.querySelector('[data-notallyhall]')) return;

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
      <div style="font-size:13px;opacity:.9;margin-bottom:6px;">
        Creator: ${owner.name} (@${owner.handle})
      </div>
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

    container.insertBefore(box, buyBtn); // insert above Buy button
  }

  const observer = new MutationObserver(() => {
    const buyBtn = [...document.querySelectorAll('button[data-slot="button"]')]
      .find(b => b.textContent.trim().toLowerCase().includes("buy") && !b.disabled);

    if (!buyBtn) return;
    observer.disconnect();

    const owner = { name: "AssassiN", handle: "assassin", pct: 100 };
    const topHolders = [
      { name: "AssassiN", pct: 100 },
      { name: "Top2", pct: 0 },
      { name: "Top3", pct: 0 },
    ];

    renderRisk(buyBtn, owner, topHolders);
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
