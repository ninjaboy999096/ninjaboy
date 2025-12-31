// this script is made using ai

(function() {
  if (window.__RISK_DEBUG_RUN__) return;
  window.__RISK_DEBUG_RUN__ = true;

  const pct = s => {
    const m = String(s).match(/([\d.]+)\s*%/);
    return m ? Number(m[1]) : 0;
  };
  const norm = s => (s || "").toLowerCase().replace(/[^a-z0-9@]/g, "").trim();

  function waitForSelector(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const interval = setInterval(() => {
        const el = document.querySelector(selector);
        if (el) { clearInterval(interval); resolve(el); }
        if (Date.now() - start > timeout) { clearInterval(interval); reject("timeout"); }
      }, 300);
    });
  }

  async function run() {
    // wait for at least one card
    let card;
    try { card = await waitForSelector('div[data-slot="card"]'); } catch(e) { return; }

    // find the Buy button inside this card
    const buyBtn = [...card.querySelectorAll("button")].find(b => b.innerText.includes("Buy"));
    if (!buyBtn) return;

    // find creator
    let creatorName = "Unknown";
    let creatorHandle = "";
    const createdIdx = card.innerText.split("\n").findIndex(l => l.includes("Created by"));
    if (createdIdx !== -1) {
      const lines = card.innerText.split("\n").map(l=>l.trim());
      creatorName = lines[createdIdx + 1] || "Unknown";
      creatorHandle = lines[createdIdx + 2] || "";
    }

    // find top holders
    const holderSection = [...card.querySelectorAll("*")].find(n => n.innerText?.trim() === "Top Holders");
    let holders = [];
    if (holderSection) {
      const holderRoot = holderSection.parentElement;
      const lines = holderRoot.innerText.split("\n").map(l=>l.trim());
      for (let i=0;i<lines.length;i++) {
        if (lines[i].endsWith("%")) {
          holders.push({
            name: lines[i-2] || "Unknown",
            percent: pct(lines[i])
          });
        }
      }
    }

    // match owner
    let ownerPercent = 0;
    let ownerIndex = -1;
    holders.forEach((h,i)=> {
      if (norm(h.name) === norm(creatorName)) {
        ownerPercent = h.percent;
        ownerIndex = i;
      }
    });

    // calculate risk points
    let points = 0;
    const reasons = [];

    if (ownerPercent <= 20) { points -=4; reasons.push(`Owner owns ${ownerPercent}% → -4 pts`); }
    else if (ownerPercent <= 40) { points -=2; reasons.push(`Owner owns ${ownerPercent}% → -2 pts`); }
    else if (ownerPercent <= 60) { reasons.push(`Owner owns ${ownerPercent}% → 0 pts`); }
    else if (ownerPercent <= 80) { points +=5; reasons.push(`Owner owns ${ownerPercent}% → +5 pts`); }
    else { points +=10; reasons.push(`Owner owns ${ownerPercent}% → +10 pts`); }

    if (ownerIndex === -1 || ownerIndex > 2) {
      points -= 4;
      reasons.push("Owner not in top 3 → -4 pts");
    }

    // ignore negatives if massive imbalance
    if (ownerPercent >= 90 && holders.length > 0 && holders.slice(1,3).every(h=>h.percent < 1)) {
      for (let i=0;i<reasons.length;i++) {
        if (reasons[i].startsWith("Top holder")) reasons[i] = reasons[i].replace(/→.*pts/, "→ 0 pts");
      }
    }

    const level = points >= 6 ? "RISKY" : points >= 2 ? "LOW RISK" : "NO RISK";

    // create risk box
    const box = document.createElement("div");
    box.setAttribute("data-notallyhall", "");
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
      <div style="opacity:.8">Creator: ${creatorName}${creatorHandle ? " ("+creatorHandle+")" : ""}</div>
      <div><b>Risk Points:</b> ${points}</div>
      <div><b>Risk Level:</b> ${level}</div>
      <div style="font-size:12px;margin-top:6px">
        <b>Reasons:</b>
        <ul>${reasons.map(r=>`<li>${r}</li>`).join("")}</ul>
      </div>
    `;

    buyBtn.parentElement.insertBefore(box, buyBtn);

    // add page debug panel
    const debugBox = document.createElement("div");
    debugBox.style.cssText = `
      position:fixed;
      bottom:5px;
      left:5px;
      background:rgba(0,0,0,0.9);
      color:#0f0;
      padding:10px;
      font-size:12px;
      max-height:200px;
      overflow:auto;
      z-index:99999;
      font-family:monospace;
      border:1px solid #0f0;
    `;
    debugBox.innerHTML = `
      <div><b>DEBUG INFO</b></div>
      <div>Creator: ${creatorName} (${creatorHandle})</div>
      <div>Owner Percent: ${ownerPercent}%</div>
      <div>Owner Index: ${ownerIndex}</div>
      <div>Holders: <pre>${JSON.stringify(holders,null,2)}</pre></div>
    `;
    document.body.appendChild(debugBox);
  }

  run();
})();
