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

  function scoreOwner(percent, scale = 1) {
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
    try {
      await waitForElement('[data-slot="card-title"]');

      // --- Get creator ---
      const creatorName =
        document.querySelector('p.truncate.text-sm.font-medium')?.textContent ||
        "Unknown";

      const creatorUser =
        document.querySelector('p.text-muted-foreground.truncate.text-xs')
          ?.textContent || "Unknown";

      // --- Get top holders ---
      const holders = [...document.querySelectorAll('[data-slot="badge"]')]
        .map(b => parseFloat(b.textContent.replace("%", "")))
        .filter(n => !isNaN(n))
        .slice(0, 3);

      const owner = holders[0] ?? 0;
      const third = holders[2] ?? 0;

      let points = 0;
      const reasons = [];

      // Owner risk
      const ownerScore = scoreOwner(owner);
      points += ownerScore;
      reasons.push(`Owner owns ${owner}% → ${ownerScore} pts`);

      // Top 3 risk (reduced scale)
      holders.forEach((p, i) => {
        if (i === 0) return;
        const s = scoreOwner(p, 0.25);
        if (s !== 0) {
          points += s;
          reasons.push(`Top holder #${i + 1} owns ${p}% → ${s} pts`);
        }
      });

      // Override: massive imbalance
      if (owner >= 80 && third <= 1) {
        points = 0;
        reasons.push(
          "⚠ Massive imbalance: owner dominates supply → overrides positives"
        );
      }

      // --- UI ---
      const box = document.createElement("div");
      box.style.cssText = `
        position: fixed;
        top: 12px;
        right: 12px;
        z-index: 999999;
        background: #111;
        color: #fff;
        font-family: monospace;
        font-size: 13px;
        padding: 12px;
        border-radius: 8px;
        max-width: 320px;
        box-shadow: 0 0 20px rgba(0,0,0,.6);
        pointer-events: none;
      `;

      box.innerHTML = `
        <b>Coin Risk Analysis</b><br><br>
        <b>Creator:</b> ${creatorName} (${creatorUser})<br>
        <b>Risk Points:</b> ${points.toFixed(2)}<br>
        <b>Risk Level:</b> ${riskLabel(points)}<br><br>
        <b>Reasons:</b><br>
        ${reasons.map(r => "• " + r).join("<br>")}
      `;

      document.body.appendChild(box);
    } catch (e) {
      console.error("Risk script failed:", e);
    }
  }

  run();
})();
