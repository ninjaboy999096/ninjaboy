// this script is AI, not by AI
(() => {
  if (window.__RISK_SCRIPT_RAN__) return;
  window.__RISK_SCRIPT_RAN__ = true;

  function ownerRisk(percent) {
    if (percent <= 20) return -4;
    if (percent <= 40) return -2;
    if (percent <= 60) return 0;
    if (percent <= 80) return 5;
    return 10;
  }

  function holderRisk(percent) {
    if (percent <= 20) return -0.5;
    if (percent <= 40) return -0.25;
    if (percent <= 60) return 0;
    if (percent <= 80) return 2.5;
    return 5;
  }

  function getRiskLevel(points) {
    if (points >= 6) return "RISKY";
    if (points >= 2) return "LOW RISK";
    if (points > 0) return "MODERATE RISK";
    return "NO RISK";
  }

  function insertRiskCard(ownerName, ownerPercent, topHolders) {
    const buyBtn = document.querySelector('button[data-slot="button"]:not([disabled])');
    if (!buyBtn) return;

    let riskPoints = ownerRisk(ownerPercent);
    const reasons = [`Owner owns ${ownerPercent}% → +${ownerRisk(ownerPercent)} pts`];

    // Filter out the owner if they appear in top holders
    const filteredHolders = topHolders.map((h, i) => {
      if (h.name === ownerName) {
        reasons.push(`Top holder #${i + 1} is the owner`);
        return null;
      }
      const pts = holderRisk(h.percent);
      reasons.push(`Top holder #${i + 1} owns ${h.percent}% → ${pts >= 0 ? "+" : ""}${pts} pts`);
      riskPoints += pts;
      return h;
    }).filter(Boolean);

    const maxOther = filteredHolders.length ? Math.max(...filteredHolders.map(h => h.percent)) : 0;
    if (ownerPercent - maxOther > 50) {
      // Disregard all “good” points if massive imbalance
      for (let i = 1; i < reasons.length; i++) {
        reasons[i] = reasons[i].replace(/→ .* pts/, "→ 0 pts");
      }
      riskPoints = ownerRisk(ownerPercent);
    }

    const riskLevel = getRiskLevel(riskPoints);

    const card = document.createElement("div");
    card.dataset.notallyhall = "";
    card.style.cssText = `
      margin-bottom: 12px;
      padding: 12px;
      border-radius: 10px;
      background: rgb(15,15,20);
      color: rgb(234,234,240);
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      border: 1px solid rgb(42,42,53);
      user-select: text;
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
          ${reasons.map(r => `<li>${r}</li>`).join("")}
        </ul>
      </div>
    `;

    buyBtn.parentElement.insertBefore(card, buyBtn);
  }

  function getCoinData() {
    // Grab the creator info
    let ownerName = "Unknown";
    const creatorLabel = [...document.querySelectorAll("div, span")].find(el => /Created by/i.test(el.textContent));
    if (creatorLabel) {
      const nextEl = creatorLabel.nextElementSibling;
      if (nextEl) ownerName = nextEl.textContent.trim();
    }

    // Get top holders from the page
    const topHolderEls = document.querySelectorAll(".top-holder");
    const topHolders = [...topHolderEls].slice(0, 3).map(el => {
      const name = el.querySelector(".name")?.textContent.trim() || "Unknown";
      const percentText = el.querySelector(".percent")?.textContent.trim() || "0%";
      const percent = parseFloat(percentText.replace("%", "")) || 0;
      return { name, percent };
    });

    // If owner not in top holders, assume 100% ownership
    let ownerPercent = 0;
    const ownerEntry = topHolders.find(h => h.name === ownerName);
    if (ownerEntry) {
      ownerPercent = ownerEntry.percent;
    } else {
      ownerPercent = 100;
    }

    return { ownerName, ownerPercent, topHolders };
  }

  const observer = new MutationObserver((mutations, obs) => {
    const buyBtn = document.querySelector('button[data-slot="button"]:not([disabled])');
    if (buyBtn) {
      const { ownerName, ownerPercent, topHolders } = getCoinData();
      insertRiskCard(ownerName, ownerPercent, topHolders);
      obs.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
