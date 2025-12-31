(() => {
  function parsePercent(text) {
    return parseFloat(text.replace("%", ""));
  }

  function getCreator() {
    // "Created by" section
    const createdBy = [...document.querySelectorAll("p, div")]
      .find(el => el.textContent?.includes("Created by"));
    if (!createdBy) return null;

    const container = createdBy.closest("div");
    const name = container?.querySelector("p:not(.text-muted-foreground)")?.textContent?.trim();
    const user = container?.querySelector(".text-muted-foreground")?.textContent?.trim()?.replace("@", "");

    return name && user ? { name, user } : null;
  }

  function getTopHolders() {
    const card = [...document.querySelectorAll('[data-slot="card-title"]')]
      .find(el => el.textContent.trim() === "Top Holders")
      ?.closest('[data-slot="card"]');

    if (!card) return [];

    return [...card.querySelectorAll(".flex.items-center.gap-2")]
      .map(row => {
        const name = row.querySelector("p.text-sm")?.textContent.trim();
        const user = row.querySelector("p.text-xs")?.textContent.replace("@", "").trim();
        const badge = row.querySelector('[data-slot="badge"]')?.textContent;
        return badge ? { name, user, percent: parsePercent(badge) } : null;
      })
      .filter(Boolean);
  }

  function scoreOwnership(pct) {
    if (pct <= 20) return { points: -4, label: "Low owner share" };
    if (pct <= 40) return { points: -2, label: "Moderate owner share" };
    if (pct <= 60) return { points: 0, label: "Neutral owner share" };
    if (pct <= 80) return { points: 5, label: "High owner control" };
    return { points: 10, label: "Extreme owner control" };
  }

  function scoreTop3(pct) {
    if (pct <= 20) return { points: -1, label: "Distributed top holders" };
    if (pct <= 40) return { points: -0.5, label: "Somewhat concentrated top holders" };
    if (pct <= 60) return { points: 0, label: "Moderate concentration" };
    if (pct <= 80) return { points: 3, label: "High top-holder concentration" };
    return { points: 6, label: "Extreme top-holder concentration" };
  }

  function analyze() {
    const creator = getCreator();
    const holders = getTopHolders();
    if (!creator || holders.length === 0) return;

    const owner = holders.find(h => h.user === creator.user);
    if (!owner) return;

    let points = 0;
    const reasons = [];

    // Owner score
    const ownerScore = scoreOwnership(owner.percent);
    points += ownerScore.points;
    reasons.push(`${ownerScore.label} (${owner.percent}%)`);

    // Top 3 score
    const top3 = holders.slice(0, 3);
    const top3Total = top3.reduce((s, h) => s + h.percent, 0);
    const top3Score = scoreTop3(top3Total);
    points += top3Score.points;
    reasons.push(`${top3Score.label} (Top 3 = ${top3Total}%)`);

    // Insane imbalance override
    const third = top3[2]?.percent ?? 0;
    if (owner.percent >= 90 && third <= 1) {
      points = 6;
      reasons.push("⚠ Extreme imbalance: owner dominance wipes positives");
    }

    let level =
      points >= 6 ? "HIGH RISK" :
      points >= 4 ? "RISKY" :
      points >= 2 ? "LOW RISK" :
      "NO RISK";

    injectUI(points, level, reasons);
  }

  function injectUI(points, level, reasons) {
    if (document.getElementById("coin-risk-box")) return;

    const box = document.createElement("div");
    box.id = "coin-risk-box";
    box.style.cssText = `
      margin-top: 12px;
      border: 1px solid #333;
      border-radius: 10px;
      padding: 12px;
      background: #0f0f14;
      color: white;
      font-size: 13px;
    `;

    box.innerHTML = `
      <div style="font-weight:600;margin-bottom:6px;">
        Coin Risk Analysis
      </div>
      <div>Risk points: <b>${points}</b></div>
      <div>Status: <b>${level}</b></div>
      <ul style="margin-top:6px;padding-left:16px;">
        ${reasons.map(r => `<li>${r}</li>`).join("")}
      </ul>
    `;

    const target = document.querySelector('[data-slot="card-title"]')?.closest('[data-slot="card"]');
    target?.after(box);
  }

  const observer = new MutationObserver(analyze);
  observer.observe(document.body, { childList: true, subtree: true });

  analyze();
})();
