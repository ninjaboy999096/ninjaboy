// this script is made using ai

(() => {
  // 🔒 prevent running twice
  if (window.__RISK_ANALYSIS_RUN__) return;
  window.__RISK_ANALYSIS_RUN__ = true;

  function parseNumber(str) {
    // remove %, commas, $ and parse float
    return parseFloat(str.replace(/[%$,]/g, "")) || 0;
  }

  function getHolders() {
    // Adjust selectors based on your page's actual top holders container
    const holderElems = document.querySelectorAll('[data-holder]');
    const holders = [];
    holderElems.forEach(el => {
      const name = el.dataset.name || "Unknown";
      const percent = parseNumber(el.dataset.percent || "0");
      holders.push({ name, percent });
    });
    return holders.sort((a, b) => b.percent - a.percent).slice(0, 3);
  }

  function getOwner() {
    // Adjust selector to find the creator / owner
    const creatorEl = document.querySelector('[data-creator]');
    if (!creatorEl) return { name: "Unknown", percent: 0 };
    const name = creatorEl.textContent.trim();
    const percentEl = document.querySelector(`[data-holder][data-name="${name}"]`);
    const percent = percentEl ? parseNumber(percentEl.dataset.percent) : 0;
    return { name, percent };
  }

  function calculateRisk(owner, holders) {
    let points = 0;
    const reasons = [];

    // Owner risk
    const o = owner.percent;
    let ownerPts = 0;
    if (o >= 0 && o <= 20) ownerPts = -4;
    else if (o <= 40) ownerPts = -2;
    else if (o <= 60) ownerPts = 0;
    else if (o <= 80) ownerPts = 5;
    else if (o <= 100) ownerPts = 10;

    points += ownerPts;
    reasons.push(`Owner owns ${o}% → ${ownerPts >= 0 ? "+" : ""}${ownerPts} pts`);

    // Top holders
    holders.forEach((h, i) => {
      if (h.name === owner.name) {
        reasons.push(`Top holder #${i + 1} is the owner`);
        return;
      }
      let pts = 0;
      const p = h.percent;
      if (p >= 0 && p <= 20) pts = -0.5;
      else if (p <= 40) pts = -0.25;
      else if (p <= 60) pts = 0;
      else if (p <= 80) pts = 0.5;
      else if (p <= 100) pts = 1;
      points += pts;
      reasons.push(`Top holder #${i + 1} owns ${p}% → ${pts >= 0 ? "+" : ""}${pts} pts`);
    });

    // Massive imbalance discard
    if (owner.percent >= 90 && holders.every(h => h.name !== owner.name && h.percent <= 1)) {
      reasons.forEach((r, i) => {
        if (r.includes("→") && r.includes("-")) {
          reasons[i] = r.replace(/→.*pts/, "→ 0 pts");
        }
      });
    }

    let level = "NO RISK";
    if (points >= 6) level = "RISKY";
    else if (points >= 2) level = "LOW RISK";
    else if (points >= 0) level = "MODERATE RISK";

    return { points, level, reasons };
  }

  function createRiskCard(owner, holders) {
    const { points, level, reasons } = calculateRisk(owner, holders);

    const card = document.createElement("div");
    card.dataset.notallyhall = "";
    card.style.cssText = `
      margin-bottom:12px;
      padding:12px;
      border-radius:10px;
      background: rgb(15, 15, 20);
      color: rgb(234,234,240);
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      border: 1px solid rgb(42,42,53);
      user-select: text;
    `;

    card.innerHTML = `
      <div style="font-weight:600;font-size:14px;margin-bottom:6px;">Coin Risk Analysis</div>
      <div style="font-size:13px;opacity:.9;margin-bottom:6px;">
        Creator: ${owner.name} (@${owner.name})
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

    return card;
  }

  function insertAboveBuyButton(card) {
    const buyButton = document.querySelector('[data-slot="button"]:not([disabled])');
    if (!buyButton) return;
    buyButton.parentElement.insertBefore(card, buyButton);
  }

  function runRiskAnalysis() {
    const owner = getOwner();
    const holders = getHolders();
    const card = createRiskCard(owner, holders);
    insertAboveBuyButton(card);
  }

  // wait for the page content to load
  if (document.readyState === "complete") {
    setTimeout(runRiskAnalysis, 2000);
  } else {
    window.addEventListener("load", () => {
      setTimeout(runRiskAnalysis, 2000);
    });
  }
})();
