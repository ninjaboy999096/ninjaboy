// this script is by AI

(() => {
  // CONFIG
  const BUY_BUTTON_SELECTOR = "div[data-slot='card-content'] button[type='button']:not([disabled])";

  // UTILITY: get visible text node ignoring scripts
  function getVisibleText(el) {
    if (!el || el.offsetParent === null) return "";
    return el.textContent.trim();
  }

  // GET OWNER NAME
  function getOwnerName() {
    // search for elements containing "Created by"
    const createdByEl = [...document.querySelectorAll("div, span")]
      .find(el => /Created by/i.test(el.textContent) && el.offsetParent !== null);
    if (!createdByEl) return "Unknown";

    let next = createdByEl.nextElementSibling;
    while (next && (!getVisibleText(next))) next = next.nextElementSibling;
    return getVisibleText(next) || "Unknown";
  }

  // GET HOLDERS
  function getTopHolders() {
    // search for elements that look like holders (could adjust for your site)
    const holders = [];
    [...document.querySelectorAll("div, span")].forEach(el => {
      const text = getVisibleText(el);
      const percentMatch = text.match(/([\d.]+)%/);
      if (percentMatch) {
        const percent = parseFloat(percentMatch[1]);
        holders.push({ name: text, percent });
      }
    });
    // sort descending
    holders.sort((a, b) => b.percent - a.percent);
    return holders.slice(0, 3);
  }

  // CALCULATE POINTS
  function calcRiskPoints(ownerPercent, topHolders) {
    let points = 0;
    let reasons = [];

    // OWNER SCORE
    if (ownerPercent >= 81) {
      points += 10;
      reasons.push(`Owner owns ${ownerPercent}% → +10 pts`);
    } else if (ownerPercent >= 61) {
      points += 5;
      reasons.push(`Owner owns ${ownerPercent}% → +5 pts`);
    } else if (ownerPercent >= 41) {
      reasons.push(`Owner owns ${ownerPercent}% → 0 pts`);
    } else if (ownerPercent >= 21) {
      points -= 2;
      reasons.push(`Owner owns ${ownerPercent}% → -2 pts`);
    } else {
      points -= 4;
      reasons.push(`Owner owns ${ownerPercent}% → -4 pts`);
    }

    // TOP 3 HOLDERS SCORE
    topHolders.forEach((h, idx) => {
      if (h.name === ownerName) {
        reasons.push(`Top holder #${idx + 1} is the owner`);
      } else {
        let pt = 0;
        if (h.percent >= 81) pt = 5;
        else if (h.percent >= 61) pt = 2;
        else if (h.percent >= 41) pt = 0;
        else if (h.percent >= 21) pt = -0.5;
        else pt = -1;

        reasons.push(`Top holder #${idx + 1} owns ${h.percent}% → ${pt} pts`);
        points += pt;
      }
    });

    // Check for massive imbalance
    if (ownerPercent >= 90 && topHolders.every(h => h.name !== ownerName && h.percent <= 1)) {
      reasons = reasons.map(r => r.replace(/→ [-+.\d]+ pts/, "→ 0 pts"));
      points = 10; // risk points stays max
      reasons.push("Massive imbalance: owner dominates supply → good signals discarded");
    }

    // Determine risk level
    let level = "NO RISK";
    if (points >= 6) level = "RISKY";
    else if (points >= 2) level = "LOW RISK";
    else if (points >= 0) level = "MODERATE";

    return { points, level, reasons };
  }

  // RENDER CARD ABOVE BUY BUTTON
  function renderRiskCard() {
    const buyBtn = document.querySelector(BUY_BUTTON_SELECTOR);
    if (!buyBtn) return;

    const card = document.createElement("div");
    card.setAttribute("data-notallyhall", "");
    card.style = `
      margin-bottom: 12px; padding: 12px; border-radius: 10px;
      background: rgb(15,15,20); color: rgb(234,234,240);
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      border: 1px solid rgb(42,42,53); user-select: text;
    `;

    const ownerPercent = parseFloat(prompt("Enter owner % (0-100)")) || 0;
    const topHolders = getTopHolders();
    const { points, level, reasons } = calcRiskPoints(ownerPercent, topHolders);

    const ownerNameDisplay = getOwnerName();

    card.innerHTML = `
      <div style="font-weight:600;font-size:14px;margin-bottom:6px;">Coin Risk Analysis</div>
      <div style="font-size:13px;opacity:.9;margin-bottom:6px;">Creator: ${ownerNameDisplay}</div>
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

    buyBtn.parentNode.insertBefore(card, buyBtn);
  }

  // Run on page load
  if (document.readyState === "complete") renderRiskCard();
  else window.addEventListener("load", renderRiskCard);
})();
