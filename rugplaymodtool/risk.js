// this script is made using ai

(() => {
  if (window.__RISK_SCRIPT_RUNNING__) return;
  window.__RISK_SCRIPT_RUNNING__ = true;

  /* ---------------- HELPERS ---------------- */

  const normalize = s =>
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9@]/g, "")
      .trim();

  const getTextLines = el =>
    (el?.innerText || "")
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean);

  const parsePercent = s => {
    const m = s.match(/([\d.]+)\s*%/);
    return m ? parseFloat(m[1]) : 0;
  };

  /* ---------------- FIND CARD ---------------- */

  function findTradeCard() {
    return [...document.querySelectorAll("div")]
      .find(d =>
        d.innerText?.includes("Created by") &&
        d.innerText?.includes("Buy")
      );
  }

  /* ---------------- CREATOR ---------------- */

  function getCreator(card) {
    const lines = getTextLines(card);
    const i = lines.findIndex(l => l.toLowerCase() === "created by");
    if (i === -1) return { name: "Unknown", handle: "" };

    const name = lines[i + 1] || "Unknown";
    const handleMatch = (lines[i + 2] || "").match(/@[\w-]+/);
    return {
      name,
      handle: handleMatch ? handleMatch[0] : ""
    };
  }

  /* ---------------- TOP HOLDERS ---------------- */

  function getTopHolders(card) {
    const lines = getTextLines(card);
    const i = lines.findIndex(l => l.toLowerCase() === "top holders");
    if (i === -1) return [];

    const holders = [];
    for (let j = i + 1; j < lines.length && holders.length < 3; j++) {
      if (!lines[j].includes("%")) continue;

      const name = lines[j - 1];
      const percent = parsePercent(lines[j]);
      if (name && percent >= 0) {
        holders.push({ name, percent });
      }
    }
    return holders;
  }

  /* ---------------- SCORING ---------------- */

  function ownerPoints(p) {
    if (p <= 20) return -4;
    if (p <= 40) return -2;
    if (p <= 60) return 0;
    if (p <= 80) return 5;
    return 10;
  }

  function holderPoints(p) {
    if (p <= 20) return -0.5;
    if (p <= 40) return -0.25;
    if (p <= 60) return 0;
    if (p <= 80) return 0.5;
    return 1;
  }

  /* ---------------- MAIN ---------------- */

  function run() {
    const card = findTradeCard();
    if (!card) return;

    const creator = getCreator(card);
    const holders = getTopHolders(card);

    const creatorNorm = normalize(creator.name);
    let ownerPercent = 0;

    holders.forEach(h => {
      if (normalize(h.name) === creatorNorm) {
        ownerPercent = h.percent;
      }
    });

    let points = 0;
    const reasons = [];

    const op = ownerPoints(ownerPercent);
    points += op;
    reasons.push(`Owner owns ${ownerPercent}% → ${op >= 0 ? "+" : ""}${op} pts`);

    const ownerInTop3 = holders.some(h => normalize(h.name) === creatorNorm);
    if (!ownerInTop3) {
      points -= 4;
      reasons.push("Owner not in top 3 → -4 pts");
    }

    holders.forEach((h, i) => {
      if (normalize(h.name) === creatorNorm) {
        reasons.push(`Top holder #${i + 1} is the owner`);
        return;
      }
      const hp = holderPoints(h.percent);
      points += hp;
      reasons.push(`Top holder #${i + 1} owns ${h.percent}% → ${hp >= 0 ? "+" : ""}${hp} pts`);
    });

    const maxOther = Math.max(...holders.filter(h => normalize(h.name) !== creatorNorm).map(h => h.percent), 0);
    if (ownerPercent - maxOther > 50) {
      points = Math.max(points, ownerPoints(ownerPercent));
      reasons.push("Massive imbalance: owner dominates supply → good signals discarded");
    }

    let level = "NO RISK";
    if (points >= 6) level = "RISKY";
    else if (points >= 2) level = "LOW RISK";
    else if (points > 0) level = "MODERATE RISK";

    /* ---------------- RENDER ---------------- */

    document.querySelector("[data-risk-box]")?.remove();

    const box = document.createElement("div");
    box.setAttribute("data-risk-box", "");
    box.style.cssText = `
      margin-bottom:12px;
      padding:12px;
      border-radius:10px;
      background:#0f0f14;
      color:#eaeaf0;
      border:1px solid #2a2a35;
      font-family:system-ui;
    `;

    box.innerHTML = `
      <div style="font-weight:600">Coin Risk Analysis</div>
      <div style="opacity:.85">Creator: ${creator.name}${creator.handle ? ` (${creator.handle})` : ""}</div>
      <div><b>Risk Points:</b> ${points}</div>
      <div><b>Risk Level:</b> ${level}</div>
      <ul style="margin:6px 0 0 16px">
        ${reasons.map(r => `<li>${r}</li>`).join("")}
      </ul>
    `;

    const buyBtn = [...card.querySelectorAll("button")]
      .find(b => /buy/i.test(b.innerText));

    if (buyBtn) buyBtn.parentElement.insertBefore(box, buyBtn);
  }

  const obs = new MutationObserver(run);
  obs.observe(document.body, { childList: true, subtree: true });
  setTimeout(run, 1000);
})();
