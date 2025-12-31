// this script is made using AI

(() => {
  if (window.__RISK_ANALYSIS_RUN__) return;
  window.__RISK_ANALYSIS_RUN__ = true;

  /* ---------- helpers ---------- */
  const parsePercent = s => {
    if (!s) return 0;
    const m = String(s).match(/([\d.,]+)\s*%/);
    if (!m) return 0;
    return parseFloat(m[1].replace(/,/g, "")) || 0;
  };

  const linesFrom = el =>
    (el && String(el.innerText || el.textContent || "")
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean)) || [];

  const normalize = s =>
    (s || "")
      .toString()
      .trim()
      .replace(/^[^\w@]+|[^\w@]+$/g, "")
      .replace(/[^\w@]+/g, " ")
      .toLowerCase();

  const round = (n, d = 2) => Math.round((n + Number.EPSILON) * 10 ** d) / 10 ** d;

  /* ---------- find coin card ---------- */
  function findCoinCard() {
    // prefer cards with "Created by" + "Buy" inside
    const cards = Array.from(document.querySelectorAll('div[data-slot="card"], div[class*="card"], section, article'));
    for (const c of cards) {
      const txt = (c.innerText || "").slice(0, 4000);
      if (/Created by/i.test(txt) && /\bBuy\b/i.test(txt)) return c;
    }
    // fallback: any card containing "Created by"
    for (const c of cards) if (/Created by/i.test(c.innerText || "")) return c;
    // fallback: any card with "Buy" or "Trade"
    for (const c of cards) if (/\bBuy\b/i.test(c.innerText || "") || /\bTrade\b/i.test(c.innerText || "")) return c;
    return null;
  }

  /* ---------- extract creator (robust) ---------- */
  function extractCreator(card) {
    if (!card) return { name: "Unknown", handle: "" };

    // 1) look for a node that says "Created by"
    const createdNodes = Array.from(card.querySelectorAll("*")).filter(n => /Created by/i.test(n.innerText || ""));
    for (const createdNode of createdNodes) {
      // try the nextElementSibling(s)
      let node = createdNode.nextElementSibling;
      if (node) {
        const lines = linesFrom(node);
        if (lines.length >= 1) {
          let name = lines[0];
          let handle = lines.length >= 2 ? lines[1] : "";
          // sometimes both are on same line like "griffin fortin (@teal)"
          const combinedMatch = name.match(/^(.+?)\s*\(?@?([\w-]+)\)?$/);
          if (combinedMatch) {
            name = combinedMatch[1].trim();
            handle = "@" + combinedMatch[2].trim();
          } else {
            const hm = handle.match(/@[\w-]+/);
            if (hm) handle = hm[0];
            else handle = handle.trim();
          }
          return { name: (name || "Unknown").trim(), handle: (handle || "").trim() };
        }
      }

      // fallback: search within the parent element lines for "Created by" and the next lines
      const parent = createdNode.parentElement;
      if (parent) {
        const lines = linesFrom(parent);
        const idx = lines.findIndex(l => /Created by/i.test(l));
        if (idx !== -1) {
          const name = lines[idx + 1] || "";
          const handleRaw = lines[idx + 2] || "";
          const combinedMatch = (name || "").match(/^(.+?)\s*\(?@?([\w-]+)\)?$/);
          if (combinedMatch) return { name: combinedMatch[1].trim() || "Unknown", handle: "@" + combinedMatch[2].trim() };
          const hm = handleRaw.match(/@[\w-]+/);
          return { name: (name || "Unknown").trim(), handle: (hm ? hm[0] : (handleRaw || "").trim()) };
        }
      }
    }

    // 2) try regex on whole card text: Created by\nNAME\nHANDLE
    const txt = card.innerText || card.textContent || "";
    const m = txt.match(/Created by[\s\r\n]+([^\r\n]+)(?:[\r\n]+([^\r\n]+))?/i);
    if (m) {
      const nameRaw = (m[1] || "").trim();
      const handleRaw = (m[2] || "").trim();
      const combinedMatch = nameRaw.match(/^(.+?)\s*\(?@?([\w-]+)\)?$/);
      if (combinedMatch) return { name: combinedMatch[1].trim(), handle: "@" + combinedMatch[2].trim() };
      const hm = handleRaw.match(/@[\w-]+/);
      return { name: (nameRaw || "Unknown"), handle: (hm ? hm[0] : (handleRaw || "")) };
    }

    return { name: "Unknown", handle: "" };
  }

  /* ---------- extract top holders ---------- */
  function extractTopHolders(card) {
    if (!card) return [];

    // find a node that mentions "Top Holders"
    let topNode = null;
    const candidateNodes = Array.from(card.querySelectorAll("*")).filter(n => (n.innerText || "").length < 1000);
    for (const n of candidateNodes) {
      if (/Top Holders/i.test(n.innerText || "")) {
        topNode = n;
        break;
      }
    }
    const root = (topNode && (topNode.closest('div[data-slot="card-content"]') || topNode.parentElement)) || card;

    // find elements under root that include a percent; dedupe by nearby containers
    const percentEls = Array.from(root.querySelectorAll("*")).filter(el => /(\d+[\d.,]*)\s*%/.test(el.innerText || ""));
    const seen = new Set();
    const holders = [];

    for (const el of percentEls) {
      // climb up to a small container likely representing a holder item
      let container = el;
      for (let i = 0; i < 6 && container && container !== root; i++) {
        const txt = (container.innerText || "").trim();
        if (/\d+[\d.,]*\s*%/.test(txt) && /[A-Za-z]/.test(txt)) break;
        container = container.parentElement;
      }
      if (!container) container = el;
      const txt = (container.innerText || "").trim();
      if (!txt) continue;

      const pctMatch = txt.match(/(\d+[\d.,]*)\s*%/);
      if (!pctMatch) continue;
      const percent = parseFloat(pctMatch[1].replace(/,/g, "")) || 0;

      // extract name candidate: prefer lines that contain letters and are not percent or $ lines
      const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      let name = "";
      for (const ln of lines) {
        if (/\d+[\d.,]*\s*%/.test(ln)) continue;
        if (/^\$/.test(ln)) continue;
        if (/[A-Za-z]/.test(ln) && ln.length <= 60) {
          name = ln;
          break;
        }
      }
      if (!name) {
        // fallback: first non-numeric line
        for (const ln of lines) {
          if (!/^[\d\$\s,%.:-]+$/.test(ln)) {
            name = ln;
            break;
          }
        }
      }
      if (!name) name = "Unknown";

      // dedupe
      const key = normalize(name) + "|" + percent;
      if (seen.has(key)) continue;
      seen.add(key);

      holders.push({ name: name.trim(), percent });
    }

    // sort and cap
    holders.sort((a, b) => b.percent - a.percent);
    return holders.slice(0, 12); // keep up to 12 so we can inspect but will use top3
  }

  /* ---------- scoring ---------- */
  function ownerScore(p) {
    if (p <= 20) return -4;
    if (p <= 40) return -2;
    if (p <= 60) return 0;
    if (p <= 80) return 5;
    return 10;
  }
  function top3ScoreReduced(p) {
    if (p <= 20) return -0.5;
    if (p <= 40) return -0.25;
    if (p <= 60) return 0;
    if (p <= 80) return 0.5;
    return 1;
  }

  /* ---------- main logic ---------- */
  function calculateAndInsert(card) {
    if (!card) return;

    const creator = extractCreator(card); // {name, handle}
    const holders = extractTopHolders(card); // array sorted desc

    const ownerNameNorm = normalize(creator.name || "");
    const ownerHandleNorm = normalize(creator.handle || "");
    let ownerPercent = 0;
    let ownerIndex = -1;

    // try exact match on name or handle among holders
    for (let i = 0; i < holders.length; i++) {
      const h = holders[i];
      const hNorm = normalize(h.name || "");
      if (!hNorm) continue;
      if (ownerNameNorm && (hNorm === ownerNameNorm || hNorm.includes(ownerNameNorm) || ownerNameNorm.includes(hNorm))) {
        ownerPercent = h.percent;
        ownerIndex = i;
        break;
      }
      if (ownerHandleNorm && (hNorm.includes(ownerHandleNorm) || ownerHandleNorm.includes(hNorm))) {
        ownerPercent = h.percent;
        ownerIndex = i;
        break;
      }
    }

    // fuzzy fallback: if owner name incomplete, match first token
    if (ownerIndex === -1 && ownerNameNorm) {
      const first = ownerNameNorm.split(" ")[0];
      for (let i = 0; i < holders.length; i++) {
        const hNorm = normalize(holders[i].name || "");
        if (hNorm.includes(first) || first.includes(hNorm)) {
          ownerPercent = holders[i].percent;
          ownerIndex = i;
          break;
        }
      }
    }

    // Build reasons and compute points
    let points = 0;
    const reasons = [];

    const oPts = ownerScore(ownerPercent);
    points += oPts;
    reasons.push(`Owner owns ${ownerPercent}% → ${oPts >= 0 ? "+" : ""}${oPts} pts`);

    // owner not in top3 penalty
    const inTop3 = ownerIndex !== -1 && ownerIndex < 3;
    if (!inTop3) {
      points -= 4;
      reasons.push("Owner not in top 3 → -4 pts");
    }

    // Evaluate top-3 holders (skip printing owner percent twice)
    const top3 = holders.slice(0, 3);
    let displayPos = 0;
    for (let i = 0; i < top3.length; i++) {
      const h = top3[i];
      if (!h) continue;
      const hNorm = normalize(h.name || "");
      if (hNorm === ownerNameNorm || (ownerHandleNorm && hNorm.includes(ownerHandleNorm))) {
        reasons.push(`Top holder #${displayPos + 1} is the owner`);
      } else {
        const hp = top3ScoreReduced(h.percent);
        points += hp;
        reasons.push(`Top holder #${displayPos + 1} owns ${h.percent}% → ${hp >= 0 ? "+" : ""}${hp} pts`);
      }
      displayPos++;
    }

    // Massive imbalance: if ownerPercent - maxOther > 50 (owner dominates) then discard negative reasons
    const maxOther = holders.filter((h, idx) => idx !== ownerIndex).reduce((m, h) => Math.max(m, h.percent || 0), 0);
    if (ownerPercent - maxOther > 50) {
      // zero out negative reason values and recompute points as sum of non-negative reason values
      let newPoints = 0;
      const newReasons = [];
      for (const r of reasons) {
        const m = r.match(/→\s*([+-]?[0-9]*\.?[0-9]+)\s*pts/);
        if (m) {
          const val = parseFloat(m[1]) || 0;
          if (val < 0) {
            newReasons.push(r.replace(/→\s*[+-]?[0-9]*\.?[0-9]+/, "→ 0"));
          } else {
            newReasons.push(r);
            newPoints += val;
          }
        } else {
          newReasons.push(r);
        }
      }
      newReasons.push("Massive imbalance: owner dominates supply → negative (good) signals set to 0");
      reasons.length = 0;
      reasons.push(...newReasons);
      points = newPoints;
    }

    // final risk level
    let level = "NO RISK";
    if (points >= 6) level = "RISKY";
    else if (points >= 2) level = "LOW RISK";
    else if (points > 0) level = "MODERATE RISK";

    // render box (remove old first)
    const existing = card.querySelector('[data-notallyhall="risk-card"]');
    if (existing) existing.remove();

    const box = document.createElement("div");
    box.setAttribute("data-notallyhall", "risk-card");
    box.style.cssText = `
      margin-bottom:12px;
      padding:12px;
      border-radius:10px;
      background: rgb(15, 15, 20);
      color: rgb(234,234,240);
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      border: 1px solid rgb(42,42,53);
      user-select: text;
    `;

    const creatorDisplay = (creator.name ? creator.name : "Unknown") + (creator.handle ? ` (${creator.handle})` : "");
    box.innerHTML = `
      <div style="font-weight:600;font-size:14px;margin-bottom:6px;">Coin Risk Analysis</div>
      <div style="font-size:13px;opacity:.9;margin-bottom:6px;">Creator: ${creatorDisplay || "Unknown"}</div>
      <div style="font-size:13px;margin-bottom:6px;">
        <b>Risk Points:</b> ${round(points, 2)}<br>
        <b>Risk Level:</b> ${level}
      </div>
      <div style="font-size:12px;opacity:.85;">
        <b>Reasons:</b>
        <ul style="margin:6px 0 0 16px;padding:0;">
          ${reasons.map(r => `<li>${r}</li>`).join("")}
        </ul>
      </div>
    `;

    // insert above buy button inside the same card
    const buyBtn =
      card.querySelector('button[data-slot="button"]:not([disabled])') ||
      Array.from(card.querySelectorAll("button")).find(b => /\bBuy\b/i.test(b.innerText || b.textContent || "")) ||
      card.querySelector("button");

    if (buyBtn && buyBtn.parentElement) {
      buyBtn.parentElement.insertBefore(box, buyBtn);
    } else {
      // fallback to top of content
      const content = card.querySelector('[data-slot="card-content"]') || card;
      content.insertBefore(box, content.firstChild);
    }
  }

  /* ---------- run & observe ---------- */
  function tryRunOnce() {
    const card = findCoinCard();
    if (!card) return false;
    calculateAndInsert(card);
    return true;
  }

  if (!tryRunOnce()) {
    const mo = new MutationObserver((m, o) => {
      if (tryRunOnce()) o.disconnect();
    });
    mo.observe(document.body, { childList: true, subtree: true });
    // retries
    setTimeout(tryRunOnce, 900);
    setTimeout(tryRunOnce, 2200);
    setTimeout(tryRunOnce, 5200);
  }
})();
