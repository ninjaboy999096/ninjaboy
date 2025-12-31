// this script is made by ai

(function () {
  "use strict";

  const PROTECT_ATTR = "data-notallyhall";

  function findTopHoldersCard() {
    return [...document.querySelectorAll('[data-slot="card"]')]
      .find(card => card.textContent.includes("Top Holders"));
  }

  function parsePercent(text) {
    const n = parseFloat(text.replace("%", ""));
    return isNaN(n) ? 0 : n;
  }

  function calculateRisk(ownerPct, top3) {
    let points = 0;
    const reasons = [];

    function ownerRule(pct) {
      if (pct <= 20) return -4;
      if (pct <= 40) return -2;
      if (pct <= 60) return 0;
      if (pct <= 80) return 5;
      return 10;
    }

    const ownerPts = ownerRule(ownerPct);
    points += ownerPts;
    reasons.push(`Owner owns ${ownerPct}% → ${ownerPts} pts`);

    top3.forEach((pct, i) => {
      let p = 0;
      if (pct <= 20) p = -1;
      else if (pct <= 40) p = -0.5;
      else if (pct <= 60) p = 0;
      else if (pct <= 80) p = 2.5;
      else p = 5;

      points += p;
      reasons.push(`Top holder #${i + 1} owns ${pct}% → ${p} pts`);
    });

    // imbalance check
    if (ownerPct >= 90 && top3.every(p => p < 1)) {
      reasons.push("Massive imbalance: owner dominates supply → all positives discarded");
      points = Math.max(points, 6);
    }

    return { points: Math.round(points * 100) / 100, reasons };
  }

  function riskLabel(points) {
    if (points >= 6) return "RISKY";
    if (points >= 4) return "PRETTY RISKY";
    if (points >= 2) return "LOW RISK";
    return "NO RISK";
  }

  function insertPanel(text) {
    const tradeCard = [...document.querySelectorAll('[data-slot="card"]')]
      .find(c => c.textContent.includes("Trade LOCK"));

    if (!tradeCard) return;

    const panel = document.createElement("div");
    panel.setAttribute(PROTECT_ATTR, "true");
    panel.style.cssText = `
      margin-top: 12px;
      padding: 12px;
      border-radius: 6px;
      background: #f8f8f8;
      color: #111;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13px;
      line-height: 1.4;
      user-select: text;
      white-space: pre-wrap;
    `;
    panel.textContent = text;

    tradeCard.querySelector('[data-slot="card-content"]')
      ?.appendChild(panel);
  }

  function run() {
    const card = findTopHoldersCard();
    if (!card) return;

    const holders = [...card.querySelectorAll(".space-y-3 > div")];

    if (holders.length === 0) return;

    const parsed = holders.map(h => {
      const name = h.querySelector("p.font-medium")?.textContent ?? "Unknown";
      const user = h.querySelector("p.text-xs")?.textContent ?? "";
      const pctText = h.querySelector('[data-slot="badge"]')?.textContent ?? "0%";
      return {
        name,
        user,
        pct: parsePercent(pctText)
      };
    });

    const creator = parsed[0];
    const top3 = parsed.slice(1, 4).map(h => h.pct);

    const { points, reasons } = calculateRisk(creator.pct, top3);
    const label = riskLabel(points);

    const output =
`Coin Risk Analysis

Creator: ${creator.name} (${creator.user})
Risk Points: ${points}
Risk Level: ${label}

Reasons:
• ${reasons.join("\n• ")}`;

    insertPanel(output);
  }

  setTimeout(run, 1500);
})();
