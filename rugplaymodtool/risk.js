// this script is made using ai
(() => {
  const parsePercentage = str => parseFloat(str.replace('%', '').trim()) || 0;

  function getCoinData(card) {
    // find creator and top holders
    const creatorEl = card.querySelector('[data-creator-name]'); // you should have a data-creator-name attribute
    const creatorHandleEl = card.querySelector('[data-creator-handle]');
    const topHolderEls = Array.from(card.querySelectorAll('[data-holder]')).slice(0, 3);

    const creatorName = creatorEl ? creatorEl.textContent.trim() : "Unknown";
    const creatorHandle = creatorHandleEl ? creatorHandleEl.textContent.trim() : "";
    const topHolders = topHolderEls.map((el, i) => {
      const name = el.getAttribute('data-name') || "Unknown";
      const percent = parsePercentage(el.getAttribute('data-percent') || "0");
      return { rank: i + 1, name, percent };
    });

    return { creatorName, creatorHandle, topHolders };
  }

  function calculateRisk(ownerPercent, topHolders) {
    let points = 0;
    const reasons = [];

    // Owner risk
    if (ownerPercent <= 20) points += -4;
    else if (ownerPercent <= 40) points += -2;
    else if (ownerPercent <= 60) points += 0;
    else if (ownerPercent <= 80) points += 5;
    else points += 10;

    reasons.push(`Owner owns ${ownerPercent}% → ${ownerPercent > 80 ? "+10 pts" : ownerPercent > 60 ? "+5 pts" : ownerPercent > 40 ? "+0 pts" : ownerPercent > 20 ? "-2 pts" : "-4 pts"}`);

    // Top holders risk
    topHolders.forEach((h, i) => {
      if (h.name === "Unknown") return; // skip empty
      if (h.percent === ownerPercent) {
        reasons.push(`Top holder #${i + 1} is the owner`);
      } else {
        let tPoints = 0;
        if (h.percent <= 20) tPoints = -0.5;
        else if (h.percent <= 40) tPoints = -0.25;
        else if (h.percent <= 60) tPoints = 0;
        else if (h.percent <= 80) tPoints = 2;
        else tPoints = 3;
        reasons.push(`Top holder #${i + 1} owns ${h.percent}% → ${tPoints} pts`);
        points += tPoints;
      }
    });

    // Check for massive imbalance
    if (ownerPercent >= 80 && topHolders.every(h => h.percent < 5 || h.percent === ownerPercent)) {
      topHolders.forEach((h, i) => {
        if (h.percent !== ownerPercent) reasons[i + 1] = reasons[i + 1].replace(/→.*pts/, '→ 0 pts');
      });
    }

    let level = points >= 6 ? "RISKY" : points >= 2 ? "LOW RISK" : "NO RISK";
    points = Math.round(points * 10) / 10;

    return { points, level, reasons };
  }

  function injectRisk(card) {
    const data = getCoinData(card);
    const ownerPercent = data.topHolders.length ? data.topHolders[0].percent : 0;
    const risk = calculateRisk(ownerPercent, data.topHolders);

    let container = card.querySelector('[data-notallyhall]');
    if (!container) {
      container = document.createElement('div');
      container.setAttribute('data-notallyhall', '');
      container.style.cssText = 'margin-top:12px;padding:12px;border-radius:10px;background:rgb(15,15,20);color:rgb(234,234,240);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;border:1px solid rgb(42,42,53);user-select:text;';
      card.appendChild(container);
    }

    container.innerHTML = `
      <div style="font-weight:600;font-size:14px;margin-bottom:6px;">Coin Risk Analysis</div>
      <div style="font-size:13px;opacity:.9;margin-bottom:6px;">
        Creator: ${data.creatorName} ${data.creatorHandle ? `(@${data.creatorHandle})` : ""}
      </div>
      <div style="font-size:13px;margin-bottom:6px;">
        <b>Risk Points:</b> ${risk.points}<br>
        <b>Risk Level:</b> ${risk.level}
      </div>
      <div style="font-size:12px;opacity:.85;">
        <b>Reasons:</b>
        <ul style="margin:6px 0 0 16px;padding:0;">
          ${risk.reasons.map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  // Find all cards that should have risk injected
  function runRiskInjection() {
    const cards = document.querySelectorAll('div[data-slot="card-content"]');
    cards.forEach(card => {
      injectRisk(card);
    });
  }

  if (document.readyState === "complete") {
    setTimeout(runRiskInjection, 2000);
  } else {
    window.addEventListener("load", () => setTimeout(runRiskInjection, 2000));
  }
})();
