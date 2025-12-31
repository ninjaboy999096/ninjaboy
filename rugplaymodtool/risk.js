// this script is made using AI

(() => {
  if (window.__RISK_ANALYSIS_RUN__) return;
  window.__RISK_ANALYSIS_RUN__ = true;

  /* ---------- small helpers ---------- */
  const parseNumber = s => {
    if (!s) return 0;
    const m = String(s).match(/([\d.,]+)\s*%?/);
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
      .replace(/[^\w@]/g, " ")
      .replace(/\s+/g, " ")
      .toLowerCase();

  /* ---------- find the right coin card ---------- */
  function findCoinCard() {
    const cards = Array.from(document.querySelectorAll('div[data-slot="card"], div[class*="card"], section, article'));
    for (const c of cards) {
      const text = (c.innerText || "").slice(0, 2000); // limit size
      if (/Created by/i.test(text) && /\bBuy\b/i.test(text)) return c;
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

    const allLines = linesFrom(card);

    // find index of a "Created by" line
    let idx = allLines.findIndex(l => /^created by$/i.test(l) || /^created by\b/i.test(l) || /created by/i.test(l));
    if (idx === -1) {
      // sometimes the label and name are on the same line: "Created by\nName\nHandle"
      // search for a line that contains 'Created by' and take subsequent tokens after it
      idx = allLines.findIndex(l => /created by/i.test(l));
    }

    if (idx !== -1) {
      // next non-empty line is name, then next non-empty is handle/username (if present)
      const name = allLines[idx + 1] || "";
      let handle = allLines[idx + 2] || "";

      // if idx+1 already contains both name and handle e.g. "griffin fortin (@teal)"
      const combined = name;
      const combinedMatch = combined.match(/^(.+?)\s*\(?@?([^)]+)\)?$/);
      if (combinedMatch) {
        const nm = combinedMatch[1].trim();
        const h = combinedMatch[2] ? "@" + combinedMatch[2].trim() : "";
        return { name: nm || "Unknown", handle: h };
      }

      // if name looks like just the handle and next line is display name, swap
      if (handle && /@/.test(name) && !/@/.test(handle)) {
        return { name: handle, handle: name.includes("@") ? name : "@" + name };
      }

      // clean handle if it's in parentheses or like "(@teal)" or "@teal"
      if (handle) {
        const hm = handle.match(/@[\w-]+/);
        if (hm) handle = hm[0];
      }

      return { name: (name || "Unknown").trim(), handle: (handle || "").trim() };
    }

    // fallback: regex within the card text (look for "Created by" then two lines)
    const txt = card.innerText || card.textContent || "";
    const m = txt.match(/Created by[\s\r\n]+(.+?)(?:[\r\n]+(.+?))?(?:\r?\n|$)/i);
    if (m) {
      const name = (m[1] || "").trim();
      let handle = (m[2] || "").trim();
      const hm = handle.match(/@[\w-]+/);
      if (hm) handle = hm[0];
      else if ((name || "").includes("@")) {
        const h2 = name.match(/@[\w-]+/);
        if (h2) return { name: name.replace(/@[\w-]+/, "").trim(), handle: h2[0] };
      }
      return { name: name || "Unknown", handle: handle || "" };
    }

    return { name: "Unknown", handle: "" };
  }

  /* ---------- extract top holders (limited to the "Top Holders" section) ---------- */
  function extractTopHolders(card) {
    if (!card) return [];

    // find the node that says "Top Holders"
    let topNode = null;
    const candidates = Array.from(card.querySelectorAll("*")).filter(n => (n.innerText || "").length < 500);
    for (const n of candidates) {
      if (/Top Holders/i.test(n.innerText || "")) {
        // prefer a nearby container that likely holds the list
        topNode = n;
        break;
      }
    }

    // if found, try to take a container near it (parent or next sibling)
    let listRoot = null;
    if (topNode) {
      listRoot = topNode.closest("div[data-slot='card-content']") || topNode.parentElement || topNode;
    } else {
      // fallback: use the whole card
      listRoot = card;
    }

    // gather elements in listRoot that contain percent strings
    const nodes = Array.from(listRoot.querySelectorAll("*")).filter(el => /(\d+[\d.,]*)\s*%/.test(el.innerText || ""));
    const seen = new Set();
    const holders = [];

    for (const n of nodes) {
      // climb up to a container that includes both name and percent if possible
      let container = n;
      for (let i = 0; i < 5 && container && container !== listRoot; i++) {
        const txt = (container.innerText || "").trim();
        // require at least one percent and some alphabetic text
        if (/\d+[\d.,]*\s*%/.test(txt) && /[A-Za-z]/.test(txt)) break;
        container = container.parentElement;
      }
      if (!container) container = n;

      const txt = (container.innerText || "").trim();
      const candidateLines = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

      // find the first percent in the text
      const pctMatch = txt.match(/(\d+[\d.,]*)\s*%/);
      if (!pctMatch) continue;
      const percent = parseFloat(pctMatch[1].replace(/,/g, "")) || 0;

      // pick a reasonable name line: first line that contains letters and isn't the percent line
      let name = "";
      for (const ln of candidateLines) {
        if (/\d+[\d.,]*\s*%/.test(ln)) continue;
        if (/\$/.test(ln)) continue;
        if (/[A-Za-z]/.test(ln) && ln.length <= 60) {
          name = ln;
          break;
        }
      }
      if (!name) {
        // fallback: take first line that isn't purely numeric
        for (const ln of candidateLines) {
          if (!/^[\d\$\s,%.:-]+$/.test(ln)) {
            name = ln;
            break;
          }
        }
      }
      if (!name) name = "Unknown";

      const key = normalize(name) + "|" + percent;
      if (seen.has(key)) continue;
      seen.add(key);
      holders.push({ name: name.trim(), percent });
    }

    // sort descending and keep top 12 to avoid over-grabbing
    holders.sort((a, b) => b.percent - a.percent);
    return holders.slice(0, 12);
  }

  /* ---------- scoring ---------- */
  function ownerScore(percent) {
    if (percent <= 20) return -4;
    if (percent <= 40) return -2;
    if (percent <= 60) return 0;
    if (percent <= 80) return 5;
    return 10;
  }
  function holderScoreReduced(percent) {
    // reduced scale for top3 holders
    if (percent <= 20) return -0.5;
    if (percent <= 40) return -0.25;
    if (percent <= 60) return 0;
    if (percent <= 80) return 0.5;
    return 1;
  }

  /* ---------- main calculate & render ---------- */
  function calculateAndRender(card) {
    if (!card) return;

    const creator = extractCreator(card);
    const holders = extractTopHolders(card);

    // find owner in holders by matching normalized name or handle
    const ownerNormalized = normalize(creator.name || "");
    const handleNormalized = normalize(creator.handle || "");
    let ownerPercent = 0;
    let ownerIndexInHolders = -1;

    for (let i = 0; i < holders.length; i++) {
      const hNorm = normalize(holders[i].name || "");
      if (ownerNormalized && (hNorm === ownerNormalized || hNorm.includes(ownerNormalized) || ownerNormalized.includes(hNorm))) {
        ownerPercent = holders[i].percent;
        ownerIndexInHolders = i;
        break;
      }
      // try matching handle if available
      if (handleNormalized && (hNorm === handleNormalized || hNorm.includes(handleNormalized))) {
        ownerPercent = holders[i].percent;
        ownerIndexInHolders = i;
        break;
      }
    }

    // If owner not found in top holders, still try fuzzy match by username substring
    if (ownerIndexInHolders === -1 && ownerNormalized) {
      for (let i = 0; i < holders.length; i++) {
        const hNorm = normalize(holders[i].name || "");
        if (hNorm.includes(ownerNormalized.split(" ")[0])) {
          ownerPercent = holders[i].percent;
          ownerIndexInHolders = i;
          break;
        }
      }
    }

    // Now compute points
    let points = 0;
    const reasons = [];

    const oPts = ownerScore(ownerPercent);
    points += oPts;
    reasons.push(`Owner owns ${ownerPercent}% → ${oPts >= 0 ? "+" : ""}${oPts} pts`);

    // Rule: if owner not in top 3, subtract 4 points (user requested)
    const top3 = holders.slice(0, 3);
    const ownerInTop3 = ownerIndexInHolders !== -1 && ownerIndexInHolders < 3;
    if (!ownerInTop3) {
      points -= 4;
      reasons.push("Owner not in top 3 → -4 pts");
    }

    // Evaluate top-3 holders (skip owner entries)
    let displayed = 0;
    for (let i = 0; i < top3.length; i++) {
      const h = top3[i];
      if (!h) continue;
      if (normalize(h.name) === ownerNormalized) {
        reasons.push(`Top holder #${displayed + 1} is the owner`);
      } else {
        const hp = holderScoreReduced(h.percent);
        points += hp;
        reasons.push(`Top holder #${displayed + 1} owns ${h.percent}% → ${hp >= 0 ? "+" : ""}${hp} pts`);
      }
      displayed++;
    }

    // Massive imbalance: if owner minus next largest > 50, discard negative (set them to 0)
    const maxOther = holders.filter(h => normalize(h.name) !== ownerNormalized).reduce((m, h) => Math.max(m, h.percent), 0);
    if (ownerPercent - maxOther > 50) {
      // zero out negative reasons and recompute points
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

    // determine level
    let level = "NO RISK";
    if (points >= 6) level = "RISKY";
    else if (points >= 2) level = "LOW RISK";
    else if (points > 0) level = "MODERATE RISK";

    // render (insert above Buy button)
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

    const creatorDisplay = creator.handle ? `${creator.name} (${creator.handle})` : (creator.name || "Unknown");

    box.innerHTML = `
      <div style="font-weight:600;font-size:14px;margin-bottom:6px;">Coin Risk Analysis</div>
      <div style="font-size:13px;opacity:.9;margin-bottom:6px;">Creator: ${creatorDisplay}</div>
      <div style="font-size:13px;margin-bottom:6px;">
        <b>Risk Points:</b> ${Number(Math.round(points * 100) / 100)}<br>
        <b>Risk Level:</b> ${level}
      </div>
      <div style="font-size:12px;opacity:.85;">
        <b>Reasons:</b>
        <ul style="margin:6px 0 0 16px;padding:0;">
          ${reasons.map(r => `<li>${r}</li>`).join("")}
        </ul>
      </div>
    `;

    // find buy button in this card (prefer enabled buy)
    const buyBtn =
      card.querySelector('button[data-slot="button"]:not([disabled])') ||
      Array.from(card.querySelectorAll("button")).find(b => /buy/i.test((b.innerText || b.textContent || "").trim())) ||
      card.querySelector("button");

    if (buyBtn && buyBtn.parentElement) buyBtn.parentElement.insertBefore(box, buyBtn);
    else {
      // fallback: insert at top of card-content
      const content = card.querySelector('[data-slot="card-content"]') || card;
      content.insertBefore(box, content.firstChild);
    }
  }

  /* ---------- run & observe ---------- */
  function tryRun() {
    const card = findCoinCard();
    if (!card) return false;
    calculateAndRender(card);
    return true;
  }

  if (!tryRun()) {
    const mo = new MutationObserver((m, o) => {
      if (tryRun()) o.disconnect();
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // retries as safety
    setTimeout(tryRun, 800);
    setTimeout(tryRun, 2200);
    setTimeout(tryRun, 5000);
  }
})();
