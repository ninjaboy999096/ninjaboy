// this script is made by ai
(() => {
  if (window.__COIN_RISK__) return;
  window.__COIN_RISK__ = true;

  function calculateRisk(owner, holders) {
    let points = 0;
    const reasons = [];

    // --- Owner risk ---
    if (owner.pct <= 20) {
      points -= 4;
      reasons.push(`Owner owns ${owner.pct}% → -4 pts`);
    } else if (owner.pct <= 40) {
      points -= 2;
      reasons.push(`Owner owns ${owner.pct}% → -2 pts`);
    } else if (owner.pct <= 60) {
      points += 0;
      reasons.push(`Owner owns ${owner.pct}% → 0 pts`);
    } else if (owner.pct <= 80) {
      points += 5;
      reasons.push(`Owner owns ${owner.pct}% → +5 pts`);
    } else if (owner.pct <= 100) {
      points += 10;
      reasons.push(`Owner owns ${owner.pct}% → +10 pts`);
    }

    // --- Top 3 holders risk (reduced effect) ---
    holders.slice(0, 3).forEach((h, i) => {
      if (h.name === owner.name) return; // skip owner in top 3
      if (h.pct <= 20) {
        points -= 0.5;
        reasons.push(`Top holder #${i + 1} owns ${h.pct}% → -0.5 pts`);
      } else if (h.pct <= 40) {
        points -= 0.25;
        reasons.push(`Top holder #${i + 1} owns ${h.pct}% → -0.25 pts`);
      } else if (h.pct <= 60) {
        points += 0;
        reasons.push(`Top holder #${i + 1} owns ${h.pct}% → 0 pts`);
      } else if (h.pct <= 80) {
        points += 2.5;
        reasons.push(`Top holder #${i + 1} owns ${h.pct}% → +2.5 pts`);
      } else if (h.pct <= 100) {
        points += 5;
        reasons.push(`Top holder #${i + 1} owns ${h.pct}% → +5 pts`);
      }
    });

    // --- Check insane imbalance ---
    const topPct = holders[0]?.pct || 0;
    const thirdPct = holders[2]?.pct || 0;
    if (topPct - thirdPct > 80) {
      reasons.push(
        "Massive imbalance: owner dominates supply → good signals discarded"
      );
      points = Math.max(points, 0); // discard negative effects
    }

    // --- Determine risk level ---
    let level = "";
    if (points >= 6) level = "RISKY";
    else if (points >= 4) level = "PRETTY RISKY";
    else if (points >= 2) level = "LOW RISK";
    else level = "NO RISK";

    return { points, level, reasons };
  }

  function renderRisk(cardEl, owner, holders) {
    if (!cardEl || cardEl.querySelector("[data-notallyhall]")) return;

    const result = calculateRisk(owner, holders);

    const box = document.createElement("div");
    box.setAttribute("data-notallyhall", "");
    box.style.cssText = `
      margin-top: 12px;
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
        <b>Risk Points:</b> ${result.points}
        <br>
        <b>Risk Level:</b> ${result.level}
      </div>
      <div style="font-size:12px;opacity:.85;">
        <b>Reasons:</b>
        <ul style="margin:6px 0 0 16px;padding:0;">
          ${result.reasons.map(r => `<li>${r}</li>`).join("")}
        </ul>
      </div>
    `;

    cardEl.appendChild(box);
  }

  // --- EXAMPLE USAGE ---
  const card = document.querySelector('[data-slot="card"]');

  const owner = { name: "AssassiN", handle: "assassin", pct: 100 };
  const topHolders = [
    { name: "AssassiN", pct: 100 },
    { name: "Stonks", pct: 0 },
    { name: "Alonso", pct: 0 },
  ];

  renderRisk(card, owner, topHolders);
})();
