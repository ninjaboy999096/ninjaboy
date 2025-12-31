// this script is by ai
(() => {
  if (window.__RISK_SCRIPT_RAN__) return;
  window.__RISK_SCRIPT_RAN__ = true;

  // ---- Risk calculation helpers ----
  function getOwnerRisk(percent) {
    if (percent <= 20) return -4;
    if (percent <= 40) return -2;
    if (percent <= 60) return 0;
    if (percent <= 80) return 5;
    return 10;
  }

  function getHolderRisk(percent) {
    if (percent <= 20) return -0.5;
    if (percent <= 40) return -0.25;
    if (percent <= 60) return 0;
    if (percent <= 80) return 2.5;
    return 5;
  }

  // ---- Insert Risk card above Buy button ----
  function insertRiskCard(ownerName, ownerPercent, topHolders) {
    const buyBtn = document.querySelector('button[data-slot="button"]:not([disabled])');
    if (!buyBtn) return;

    let riskPoints = getOwnerRisk(ownerPercent);
    const reasons = [`Owner owns ${ownerPercent}% → +${riskPoints} pts`];

    const filteredHolders = topHolders.filter(h => h.name !== ownerName);
    filteredHolders.forEach((h, i) => {
      reasons.push(`Top holder #${i+1} owns ${h.percent}% → ${getHolderRisk(h.percent) > 0 ? '+' : ''}${getHolderRisk(h.percent)} pts`);
      riskPoints += getHolderRisk(h.percent);
    });

    // Massive imbalance: owner >> rest
    const maxOther = filteredHolders.length ? Math.max(...filteredHolders.map(h=>h.percent)) : 0;
    if (ownerPercent - maxOther > 50) {
      filteredHolders.forEach((_, i) => reasons[i+1] = reasons[i+1].replace(/→ .* pts/, '→ 0 pts'));
      if (riskPoints > 0) riskPoints = getOwnerRisk(ownerPercent);
    }

    let riskLevel = "NO RISK";
    if (riskPoints >= 6) riskLevel = "RISKY";
    else if (riskPoints >= 2) riskLevel = "LOW RISK";
    else if (riskPoints > 0) riskLevel = "MODERATE RISK";

    const card = document.createElement("div");
    card.dataset.notallyhall = "";
    card.style.cssText = `
      margin-bottom: 12px; padding: 12px; border-radius: 10px;
      background: rgb(15,15,20); color: rgb(234,234,240);
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      border: 1px solid rgb(42,42,53); user-select: text;
    `;
    card.innerHTML = `
      <div style="font-weight:600;font-size:14px;margin-bottom:6px;">Coin Risk Analysis</div>
      <div style="font-size:13px;opacity:.9;margin-bottom:6px;">Creator: ${ownerName}</div>
      <div style="font-size:13px;margin-bottom:6px;">
        <b>Risk Points:</b> ${riskPoints}<br>
        <b>Risk Level:</b> ${riskLevel}
      </div>
      <div style="font-size:12px;opacity:.85;">
        <b>Reasons:</b>
        <ul style="margin:6px 0 0 16px;padding:0;">
          ${reasons.map(r=>`<li>${r}</li>`).join("")}
        </ul>
      </div>
    `;

    buyBtn.parentElement.insertBefore(card, buyBtn);
  }

  // ---- Get coin data dynamically from page ----
  function getCoinData() {
    // Look for "Created by" or "creator" labels
    let creatorEl = [...document.querySelectorAll("div, span")].find(el => /Created by/i.test(el.textContent));
    let ownerName = creatorEl?.nextElementSibling?.textContent || "Unknown";

    // Attempt to parse owner % if available; fallback 100%
    let ownerPercent = 100;
    const percentMatch = creatorEl?.nextElementSibling?.textContent.match(/(\d+)%/);
    if (percentMatch) ownerPercent = parseFloat(percentMatch[1]);

    // Get top holders dynamically if page lists them
    const topHolderEls = document.querySelectorAll(".top-holder"); // replace with actual selector
    const topHolders = [...topHolderEls].slice(0,3).map((el) => {
      const name = el.querySelector(".name")?.textContent || "Unknown";
      const percentText = el.querySelector(".percent")?.textContent || "0%";
      const percent = parseFloat(percentText.replace("%","")) || 0;
      return { name, percent };
    });

    return { ownerName, ownerPercent, topHolders };
  }

  // ---- Run script when Buy button exists ----
  const observer = new MutationObserver((mutations, obs)=>{
    if(document.querySelector('button[data-slot="button"]:not([disabled])')){
      const { ownerName, ownerPercent, topHolders } = getCoinData();
      insertRiskCard(ownerName, ownerPercent, topHolders);
      obs.disconnect();
    }
  });
  observer.observe(document.body, { childList:true, subtree:true });
})();
