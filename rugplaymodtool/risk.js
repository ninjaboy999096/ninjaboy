// this script is made by ai
(() => {
  // prevent double-run
  if (window.__COIN_RISK_RAN__) return;
  window.__COIN_RISK_RAN__ = true;

  function parsePercent(text) {
    const n = parseFloat(text.replace("%", ""));
    return isNaN(n) ? 0 : n;
  }

  function riskFromPercent(p) {
    if (p <= 20) return { pts: -4, label: "low ownership" };
    if (p <= 40) return { pts: -2, label: "moderate ownership" };
    if (p <= 60) return { pts: 0, label: "balanced ownership" };
    if (p <= 80) return { pts: 5, label: "high ownership" };
    return { pts: 10, label: "extreme ownership" };
  }

  function run() {
    const holderRows = Array.from(
      document.querySelectorAll('[data-slot="card"]')
    ).find(c =>
      c.textContent.includes("Top Holders")
    );

    if (!holderRows) return;

    const holders = Array.from(
      holderRows.querySelectorAll(".flex.items-center.gap-2")
    );

    if (!holders.length) return;

    const parsed = holders.map(row => {
      const name =
        row.querySelector("p.text-sm")?.textContent?.trim() ?? "Unknown";
      const user =
        row.querySelector("p.text-xs")?.textContent?.trim() ?? "";
      const percentText =
        row.querySelector('[data-slot="badge"]')?.textContent ?? "0%";

      return {
        name,
        user,
        percent: parsePercent(percentText)
      };
    });

    const creator = parsed[0];
    const top3 = parsed.slice(0, 3);

    let riskPoints = 0;
    const reasons = [];

    // ---- creator ownership ----
    const ownerRisk = riskFromPercent(creator.percent);
    riskPoints += ownerRisk.pts;
    reasons.push(
      `Owner owns ${creator.percent}% → ${ownerRisk.pts} pts`
    );

    // ---- top 3 holders check (reduced weight) ----
    top3.forEach((h, i) => {
      if (i === 0) return;
      if (h.percent <= 20) {
        riskPoints -= 0.5;
        reasons.push(
          `Top holder #${i + 1} owns ${h.percent}% → -0.5 pts`
        );
      } else if (h.percent >= 81) {
        riskPoints += 5;
        reasons.push(
          `Top holder #${i + 1} owns ${h.percent}% → +5 pts`
        );
      }
    });

    // ---- imbalance override ----
    if (creator.percent >= 90 && parsed[1]?.percent === 0) {
      riskPoints = Math.max(riskPoints, 10);
      reasons.push(
        "Massive imbalance: owner dominates supply → positives discarded"
      );
    }

    // ---- clamp ----
    riskPoints = Math.round(riskPoints * 10) / 10;

    let riskLevel = "NO RISK";
    if (riskPoints >= 6) riskLevel = "RISKY";
    else if (riskPoints >= 4) riskLevel = "PRETTY RISKY";
    else if (riskPoints >= 2) riskLevel = "LOW RISK";

    // ---- insert UI ----
    const targetCard = Array.from(
      document.querySelectorAll('[data-slot="card"]')
    ).find(c => c.textContent.includes("Trade LOCK"));

    if (!targetCard) return;

    const box = document.createElement("div");
    box.setAttribute("data-notallyhall", "");
    box.style.cssText = `
      margin-top: 12px;
      padding: 12px;
      border-radius: 10px;
      background: #0f0f14;
      color: #eaeaf0;
      font-family: system-ui, -apple-system, Segoe UI, sans-serif;
      border: 1px solid #2a2a35;
      user-select: text;
    `;

    box.innerHTML = `
      <div style="font-weight:600;font-size:14px;margin-bottom:6px;">
        Coin Risk Analysis
      </div>

      <div style="font-size:13px;opacity:.9;margin-bottom:6px;">
        Creator: ${creator.name} (${creator.user})
      </div>

      <div style="font-size:13px;margin-bottom:6px;">
        <b>Risk Points:</b> ${riskPoints}
        <br>
        <b>Risk Level:</b> ${riskLevel}
      </div>

      <div style="font-size:12px;opacity:.85;">
        <b>Reasons:</b>
        <ul style="margin:6px 0 0 16px;padding:0;">
          ${reasons.map(r => `<li>${r}</li>`).join("")}
        </ul>
      </div>
    `;

    targetCard.appendChild(box);
  }

  if (document.readyState === "complete") {
    setTimeout(run, 800);
  } else {
    window.addEventListener("load", () => setTimeout(run, 800));
  }
})();
