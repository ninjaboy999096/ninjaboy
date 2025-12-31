// this script is made using ai

(() => {
  if (window.__RISK_SCRIPT_LOADED__) return;
  window.__RISK_SCRIPT_LOADED__ = true;

  /* ----------------- helpers ----------------- */
  const norm = s => (s || "").trim().replace(/\s+/g, " ").toLowerCase();
  const num = s => {
    const m = String(s || "").match(/([\d.]+)\s*%/);
    return m ? parseFloat(m[1]) : 0;
  };

  /* ----------------- find main trade card ----------------- */
  function findTradeCard() {
    return [...document.querySelectorAll('div[data-slot="card"]')].find(c =>
      /Created by/i.test(c.innerText) && /Buy/i.test(c.innerText)
    );
  }

  /* ----------------- FIXED CREATOR EXTRACTION ----------------- */
  function getCreator(card) {
    const lines = card.innerText
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean);

    const idx = lines.findIndex(l => l === "Created by");
    if (idx !== -1) {
      const name = lines[idx + 1] || "";
      const handleLine = lines[idx + 2] || "";
      const handleMatch = handleLine.match(/@[\w_-]+/);

      return {
        name: name || "Unknown",
        handle: handleMatch ? handleMatch[0] : ""
      };
    }

    return { name: "Unknown", handle: "" };
  }

  /* ----------------- extract top holders ----------------- */
  function getTopHolders(card) {
    const holders = [];
    const seen = new Set();

    [...card.querySelectorAll("*")].forEach(el => {
      const text = el.innerText || "";
      if (!/%/.test(text)) return;

      const pct = num(text);
      if (!pct) return;

      const lines = text.split("\n").map(l => l.trim());
      const name = lines.find(l => /[a-z]/i.test(l) && !/%/.test(l) && !/\$/.test(l));

      if (!name) return;
      const key = norm(name) + pct;
      if (seen.has(key)) return;
      seen.add(key);

      holders.push({ name, percent: pct });
    });

    return holders.sort((a, b) => b.percent - a.percent).slice(0, 10);
  }

  /* ----------------- scoring ----------------- */
  function ownerScore(p) {
    if (p === 0) return 0;
    if (p <= 20) return -4;
    if (p <= 40) return -2;
    if (p <= 60) return 0;
    if (p <= 80) return 5;
    return 10;
  }

  /* ----------------- render ----------------- */
  function render(card) {
    if (!card) return;

    const creator = getCreator(card);
    const holders = getTopHolders(card);

    const ownerNorm = norm(creator.name);
    const ownerEntry = holders.find(h => norm(h.name) === ownerNorm);
    const ownerPercent = ownerEntry ? ownerEntry.percent : 0;

    let points = 0;
    const reasons = [];

    const oPts = ownerScore(ownerPercent);
    points += oPts;
    reasons.push(`Owner owns ${ownerPercent}% → ${oPts >= 0 ? "+" : ""}${oPts} pts`);

    const ownerTopIndex = holders.findIndex(h => norm(h.name) === ownerNorm);
    if (ownerTopIndex === -1 && ownerPercent > 0) {
      points -= 4;
      reasons.push("Owner not in top 3 → -4 pts");
    }

    holders.slice(0, 3).forEach((h, i) => {
      if (norm(h.name) === ownerNorm) {
        reasons.push(`Top holder #${i + 1} is the owner`);
      } else {
        const pts = h.percent > 50 ? 2.5 : -0.5;
        points += pts;
        reasons.push(
          `Top holder #${i + 1} owns ${h.percent}% → ${pts > 0 ? "+" : ""}${pts} pts`
        );
      }
    });

    let level = "NO RISK";
    if (points >= 6) level = "RISKY";
    else if (points >= 2) level = "LOW RISK";

    card.querySelector('[data-risk-box]')?.remove();

    const box = document.createElement("div");
    box.dataset.riskBox = "true";
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
      <b>Coin Risk Analysis</b><br>
      Creator: ${creator.name}${creator.handle ? ` (${creator.handle})` : ""}<br><br>
      <b>Risk Points:</b> ${points}<br>
      <b>Risk Level:</b> ${level}<br><br>
      <b>Reasons:</b>
      <ul>${reasons.map(r => `<li>${r}</li>`).join("")}</ul>
    `;

    const buyBtn = [...card.querySelectorAll("button")].find(b =>
      /Buy/i.test(b.innerText)
    );

    buyBtn?.parentElement?.insertBefore(box, buyBtn);
  }

  /* ----------------- run ----------------- */
  function run() {
    const card = findTradeCard();
    if (!card) return;
    render(card);
  }

  run();
  new MutationObserver(run).observe(document.body, {
    childList: true,
    subtree: true
  });
})();
