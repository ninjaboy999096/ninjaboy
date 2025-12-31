// this script is made using AI

(() => {
  // Only run once
  if (window.__RISK_SCRIPT_RAN__) return;
  window.__RISK_SCRIPT_RAN__ = true;

  function getCoinData() {
    // Example: adapt to your site structure
    const creatorEl = document.querySelector('[data-slot="creator"]');
    const ownerEl = document.querySelector('[data-slot="owner"]');
    const holdersEls = document.querySelectorAll('[data-slot="top-holder"]');

    const creator = creatorEl?.textContent.trim() || "Unknown";
    const ownerName = ownerEl?.textContent.trim() || "Unknown";

    const owners = [];
    owners.push({ name: ownerName, percent: parseFloat(ownerEl?.dataset.percent || "0") });

    holdersEls.forEach((h) => {
      const name = h.dataset.name;
      const percent = parseFloat(h.dataset.percent || "0");
      owners.push({ name, percent });
    });

    return { creator, owners };
  }

  function calculateRisk(owners) {
    const owner = owners[0];
    let points = 0;
    let reasons = [];

    // Owner risk
    if (owner.percent <= 20) points -= 4;
    else if (owner.percent <= 40) points -= 2;
    else if (owner.percent <= 60) points += 0;
    else if (owner.percent <= 80) points += 5;
    else points += 10;

    reasons.push(`Owner owns ${owner.percent}% → ${owner.percent > 80 ? "+10 pts" : owner.percent > 60 ? "+5 pts" : owner.percent <= 20 ? "-4 pts" : owner.percent <= 40 ? "-2 pts" : "0 pts"}`);

    // Top 3 holders (excluding owner if already top)
    const topHolders = owners.slice(1, 4);
    topHolders.forEach((h, i) => {
      if (h.percent <= 20) points -= 0.5;
      else if (h.percent <= 40) points -= 0.25;
      else points += 0;

      reasons.push(`${h.name ? `Top holder #${i+1} owns ${h.percent}%` : `Top holder #${i+1} unknown`} → ${h.percent <= 20 ? "-0.5 pts" : h.percent <= 40 ? "-0.25 pts" : "0 pts"}`);
    });

    // Massive imbalance check
    const thirdPercent = topHolders[1]?.percent || 0;
    if (owner.percent - thirdPercent > 50) {
      // Discard all negative points
      reasons = reasons.map(r => r.replace(/-.*pts/, "0 pts"));
    }

    const riskLevel = points >= 6 ? "RISKY" : points >= 2 ? "LOW RISK" : "NO RISK";

    return { points, riskLevel, reasons };
  }

  function renderRiskCard(data) {
    const { creator, owners } = data;
    const { points, riskLevel, reasons } = calculateRisk(owners);

    const card = document.createElement("div");
    card.setAttribute("data-notallyhall", "");
    card.style.cssText = `
      margin-bottom: 12px; 
      padding: 12px; 
      border-radius: 10px; 
      background: rgb(15, 15, 20); 
      color: rgb(234, 234, 240); 
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif; 
      border: 1px solid rgb(42, 42, 53); 
      user-select: text;
    `;

    card.innerHTML = `
      <div style="font-weight:600;font-size:14px;margin-bottom:6px;">Coin Risk Analysis</div>
      <div style="font-size:13px;opacity:.9;margin-bottom:6px;">Creator: ${creator}</div>
      <div style="font-size:13px;margin-bottom:6px;">
        <b>Risk Points:</b> ${points}<br>
        <b>Risk Level:</b> ${riskLevel}
      </div>
      <div style="font-size:12px;opacity:.85;">
        <b>Reasons:</b>
        <ul style="margin:6px 0 0 16px;padding:0;">
          ${reasons.map(r => `<li>${r}</li>`).join("")}
        </ul>
      </div>
    `;

    // Insert above the Buy button
    const buyBtn = document.querySelector('button[data-slot="button"][type="button"]');
    if (buyBtn) buyBtn.parentElement.insertBefore(card, buyBtn);
  }

  function run() {
    const data = getCoinData();
    renderRiskCard(data);
  }

  // Wait until page is loaded
  if (document.readyState === "complete") {
    run();
  } else {
    window.addEventListener("load", run);
  }
})();
