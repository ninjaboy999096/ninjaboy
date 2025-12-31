// this script is made using AI
(() => {
  // 🔒 prevent multiple runs
  if (window.__RISK_CARD_RAN__) return;
  window.__RISK_CARD_RAN__ = true;

  // Wait until the page content is fully loaded
  function onReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      setTimeout(fn, 100);
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  onReady(() => {
    try {
      // Find the card content where buttons live
      const card = document.querySelector('div[data-slot="card-content"]');
      if (!card) return;

      // Remove old card if it exists
      const old = card.querySelector('[data-notallyhall-risk]');
      if (old) old.remove();

      // Fetch holder data
      // Update these selectors according to your page structure
      const holders = Array.from(document.querySelectorAll('[data-holder]')).map(h => ({
        name: h.getAttribute('data-name') || "Unknown",
        percent: parseFloat(h.getAttribute('data-percent') || "0")
      }));

      if (holders.length === 0) {
        console.warn("No holder data found.");
        return;
      }

      // Determine owner = holder with highest percent
      holders.sort((a, b) => b.percent - a.percent);
      const owner = holders[0];
      const top3 = holders.slice(1, 3);

      // Risk calculation functions
      function ownerRisk(pct) {
        if (pct <= 20) return -4;
        if (pct <= 40) return -2;
        if (pct <= 60) return 0;
        if (pct <= 80) return 5;
        return 10;
      }

      function topRisk(pct) {
        if (pct <= 20) return -0.5;
        if (pct <= 40) return -0.25;
        if (pct <= 60) return 0;
        if (pct <= 80) return 2.5;
        return 5;
      }

      let riskPoints = ownerRisk(owner.percent);
      const reasons = [];
      reasons.push(`Owner owns ${owner.percent}% → ${riskPoints >= 0 ? "+" : ""}${riskPoints} pts`);

      // Top holders
      top3.forEach((h, i) => {
        if (h.name === owner.name) {
          reasons.push(`Top holder #${i + 1} is the owner`);
        } else {
          let pts = topRisk(h.percent);
          reasons.push(`Top holder #${i + 1} owns ${h.percent}% → ${pts >= 0 ? "+" : ""}${pts} pts`);
          riskPoints += pts;
        }
      });

      // Check massive imbalance
      const thirdPercent = top3[1] ? top3[1].percent : 0;
      if (owner.percent - thirdPercent > 50) {
        // Discard good signals (set all negative points to 0)
        for (let i = 0; i < reasons.length; i++) {
          if (reasons[i].includes("→") && reasons[i].includes("-")) {
            reasons[i] = reasons[i].replace(/-\d+(\.\d+)?/g, "0");
          }
        }
      }

      // Determine risk level
      let level = "NO RISK";
      if (riskPoints >= 6) level = "RISKY";
      else if (riskPoints >= 2) level = "LOW RISK";

      // Build the risk card
      const riskCard = document.createElement("div");
      riskCard.setAttribute("data-notallyhall-risk", "");
      riskCard.style.cssText = `
        margin-bottom: 12px; 
        padding: 12px; 
        border-radius: 10px; 
        background: rgb(15, 15, 20); 
        color: rgb(234, 234, 240); 
        font-family: "Comic Sans MS", system-ui, sans-serif; 
        border: 1px solid rgb(42, 42, 53);
        user-select: text;
      `;
      riskCard.innerHTML = `
        <div style="font-weight:600;font-size:14px;margin-bottom:6px;">Coin Risk Analysis</div>
        <div style="font-size:13px;opacity:.9;margin-bottom:6px;">
          Creator: ${owner.name} (${owner.name.startsWith("@") ? owner.name : "@" + owner.name})
        </div>
        <div style="font-size:13px;margin-bottom:6px;">
          <b>Risk Points:</b> ${riskPoints}<br>
          <b>Risk Level:</b> ${level}
        </div>
        <div style="font-size:12px;opacity:.85;">
          <b>Reasons:</b>
          <ul style="margin:6px 0 0 16px;padding:0;">
            ${reasons.map(r => `<li>${r}</li>`).join("")}
          </ul>
        </div>
      `;

      // Insert above the Buy button
      const buyButton = card.querySelector('button[data-slot="button"]');
      if (buyButton) {
        buyButton.parentElement.insertBefore(riskCard, buyButton);
      }

    } catch (err) {
      console.error("Risk script error:", err);
    }
  });
})();
