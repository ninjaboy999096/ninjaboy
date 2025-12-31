// this script is made using ai

(() => {
  if (window.__RISK_ANALYSIS_RUN__) return;
  window.__RISK_ANALYSIS_RUN__ = true;

  function parsePercent(str) {
    return parseFloat(str.replace(/[%$,]/g, "")) || 0;
  }

  function getOwner() {
    const creatorText = [...document.querySelectorAll("div")].find(div =>
      div.textContent.includes("Created by")
    );
    if (!creatorText) return { name: "Unknown", percent: 0 };

    const nameLine = creatorText.nextElementSibling;
    if (!nameLine) return { name: "Unknown", percent: 0 };

    const name = nameLine.textContent.trim();
    return { name, percent: 0 }; // percent will come from top holders
  }

  function getTopHolders() {
    const holdersSection = [...document.querySelectorAll("div")].find(div =>
      div.textContent.includes("Top Holders")
    );
    if (!holdersSection) return [];

    const rows = [...holdersSection.querySelectorAll("div")].filter(
      el => el.textContent.includes("%")
    );

    const holders = [];
    for (let i = 0; i < rows.length; i += 3) {
      const name = rows[i].textContent.trim();
      const percent = parsePercent(rows[i + 1]?.textContent || "0%");
      holders.push({ name, percent });
    }
    return holders;
  }

  function calculateRisk(owner, holders) {
    let points = 0;
    const reasons = [];

    // Find the owner's percent in top holders
    const ownerHolder = holders.find(h => h.name === owner.name);
    const ownerPercent = ownerHolder ? ownerHolder.percent : 0;

    let ownerPts = 0;
    if (ownerPercent <= 20) ownerPts = -4;
    else if (ownerPercent <= 40) ownerPts = -2;
    else if (ownerPercent <= 60) ownerPts = 0;
    else if (ownerPercent <= 80) ownerPts = 5;
    else if (ownerPercent <= 100) ownerPts = 10;

    points += ownerPts;
    reasons.push(`Owner owns ${ownerPercent}% → ${ownerPts >= 0 ? "+" : ""}${ownerPts} pts`);

    holders.forEach((h, i) => {
      if (h.name === owner.name) {
        reasons.push(`Top holder #${i + 1} is the owner`);
        return;
      }
      let pts = 0;
      if (h.percent <= 20) pts = -0.5;
      else if (h.percent <= 40) pts = -0.25;
      else if (h.percent <= 60) pts = 0;
      else if (h.percent <= 80) pts = 0.5;
      else if (h.percent <= 100) pts = 1;
      points += pts;
      reasons.push(`Top holder #${i + 1} owns ${h.percent}% → ${pts >= 0 ? "+" : ""}${pts} pts`);
    });

    // Massive imbalance discard
    if (ownerPercent >= 90 && holders.every(h => h.name !== owner.name && h.percent <= 1)) {
      for (let i = 0; i < reasons.length; i++) {
        if (reasons[i].includes("→") && reasons[i].includes("-")) reasons[i] = reasons[i].replace(/→.*pts/, "→ 0 pts");
      }
    }

    let level = "NO RISK";
    if (points >= 6) level = "RISKY";
    else if (points >= 2) level = "LOW RISK";
    else if (points >= 0) level = "MODERATE RISK";

    return { points, level, reasons };
  }

  function createCard(owner, holders) {
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
    if (buyButton && buyButton.parentElement) {
      buyButton.parentElement.insertBefore(card, buyButton);
    }
  }

  function run() {
    const owner = getOwner();
    const holders = getTopHolders();
    const card = createCard(owner, holders);
    insertAboveBuyButton(card);
  }

  if (document.readyState === "complete") setTimeout(run, 2000);
  else window.addEventListener("load", () => setTimeout(run, 2000));
})();
