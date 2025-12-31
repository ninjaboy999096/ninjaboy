// THIS SCRIPT IS MADE BY AI

(function () {
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const interval = setInterval(() => {
        const el = document.querySelector(selector);
        if (el) {
          clearInterval(interval);
          resolve(el);
        }
        if (Date.now() - start > timeout) {
          clearInterval(interval);
          reject("Timeout waiting for " + selector);
        }
      }, 200);
    });
  }

  function score(percent, scale = 1) {
    if (percent <= 20) return -4 * scale;
    if (percent <= 40) return -2 * scale;
    if (percent <= 60) return 0;
    if (percent <= 80) return 5 * scale;
    return 10 * scale;
  }

  function riskLabel(points) {
    if (points >= 6) return "RISKY";
    if (points >= 4) return "PRETTY RISKY";
    if (points >= 2) return "LOW RISK";
    return "NO RISK";
  }

  async function run() {
    await waitForElement('[data-slot="card-title"]');

    /* -------- Creator (from "Created by") -------- */
    const creatorBlock = [...document.querySelectorAll("p")]
      .find(p => p.textContent?.startsWith("@"))?.parentElement;

    const creatorName =
      creatorBlock?.querySelector("p.text-sm")?.textContent ?? "Unknown";
    const creatorUser =
      creatorBlock?.querySelector("p.text-xs")?.textContent ?? "Unknown";

    /* -------- Top Holders (from Top Holders card ONLY) -------- */
    const topHoldersCard = [...document.querySelectorAll('[data-slot="card-title"]')]
      .find(e => e.textContent.includes("Top Holders"))
      ?.closest('[data-slot="card"]');

    if (!topHoldersCard) return;

    const rows = [...topHoldersCard.querySelectorAll('[data-slot="badge"]')];

    const percents = rows
      .map(b => parseFloat(b.textContent.replace("%", "")))
      .filter(n => !isNaN(n))
      .slice(0, 3);

    const owner = percents[0] ?? 0;
    const third = percents[2] ?? 0;

    let points = 0;
    const reasons = [];

    /* -------- Owner check -------- */
    const ownerPts = score(owner);
    points += ownerPts;
    reasons.push(`Owner owns ${owner}% → ${ownerPts} pts`);

    /* -------- Top 3 check (reduced scale) -------- */
    percents.forEach((p, i) => {
      if (i === 0) return;
      const s = score(p, 0.25);
      if (s !== 0) {
        points += s;
        reasons.push(`Top holder #${i + 1} owns ${p}% → ${s} pts`);
      }
    });

    /* -------- Imbalance override -------- */
    if (owner >= 80 && third <= 1) {
      points = 0;
      reasons.push(
        "Massive imbalance: owner dominates supply → good signals discarded"
      );
    }

    /* -------- Inject into Trade LOCK card -------- */
    const tradeLockCard = [...document.querySelectorAll('[data-slot="card-title"]')]
      .find(e => e.textContent.includes("Trade LOCK"))
      ?.closest('[data-slot="card"]');

    if (!tradeLockCard) return;

    const box = document.createElement("div");
    box.style.cssText = `
      margin-top: 12px;
      padding: 10px;
      border-radius: 6px;
      background: rgba(0,0,0,0.05);
      font-family: monospace;
      font-size: 12px;
      user-select: text;
    `;

    box.innerHTML = `
      <b>Coin Risk Analysis</b><br><br>
      <b>Creator:</b> ${creatorName} (${creatorUser})<br>
      <b>Risk Points:</b> ${points.toFixed(2)}<br>
      <b>Risk Level:</b> ${riskLabel(points)}<br><br>
      <b>Reasons:</b><br>
      ${reasons.map(r => "• " + r).join("<br>")}
    `;

    tradeLockCard.querySelector('[data-slot="card-content"]')
      ?.appendChild(box);
  }

  run().catch(console.error);
})();
