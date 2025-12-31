// this script is made using AI

(() => {
  if (window.__RISK_ANALYSIS_RUN__) return;
  window.__RISK_ANALYSIS_RUN__ = true;

  /* ---------- Helpers ---------- */
  const parseNumber = str => {
    if (!str) return 0;
    const m = String(str).match(/([\d.,]+)\s*%?/);
    if (!m) return 0;
    return parseFloat(m[1].replace(/,/g, "")) || 0;
  };

  const textLines = el =>
    el
      ? el
          .innerText
          .split(/\r?\n/)
          .map(l => l.trim())
          .filter(Boolean)
      : [];

  const normalize = s => (s || "").trim().replace(/\s+/g, " ").toLowerCase();

  function ownerRisk(percent) {
    if (percent <= 20) return -4;
    if (percent <= 40) return -2;
    if (percent <= 60) return 0;
    if (percent <= 80) return 5;
    return 10;
  }

  function holderRisk(percent) {
    if (percent <= 20) return -0.5;
    if (percent <= 40) return -0.25;
    if (percent <= 60) return 0;
    if (percent <= 80) return 2.5;
    return 5;
  }

  /* ---------- DOM parsing heuristics ---------- */

  // Find the coin card we care about:
  function findCoinCard() {
    // Look for cards that have "Created by" or a buy button inside
    const cards = Array.from(document.querySelectorAll('div[data-slot="card"], div[class*="card"]'));
    for (const c of cards) {
      const text = c.innerText || "";
      if (/Created by/i.test(text) || /\bBuy\b/i.test(text) || /\bTrade\b/i.test(text)) {
        // prefer contexts that also have a buy button (main trade card)
        const buyBtn = c.querySelector('button[data-slot="button"], button');
        if (buyBtn && /buy/i.test(buyBtn.innerText || "")) return c;
      }
    }

    // fallback: any card containing "Created by"
    for (const c of cards) {
      if (/Created by/i.test(c.innerText || "")) return c;
    }

    // fallback: any card with a buy button
    for (const c of cards) {
      const buyBtn = c.querySelector('button[data-slot="button"], button');
      if (buyBtn && /buy/i.test(buyBtn.innerText || "")) return c;
    }

    return null;
  }

  // Extract creator name & handle using multiple heuristics
  function extractCreator(card) {
    if (!card) return { name: "Unknown", handle: "" };

    // 1) find exact node that contains "Created by"
    let createdNode = null;
    const candidates = Array.from(card.querySelectorAll("*")).filter(n => n.childElementCount <= 6);
    for (const n of candidates) {
      if (/Created by/i.test(n.innerText || "")) {
        createdNode = n;
        break;
      }
    }

    // 2) if found, try to take the following lines (siblings or next elements)
    if (createdNode) {
      // Try nextElementSibling first
      let next = createdNode.nextElementSibling;
      if (next) {
        const lines = textLines(next);
        if (lines.length >= 1) {
          const name = lines[0];
          const handle = lines[1] || "";
          return { name: name || "Unknown", handle: handle || "" };
        }
      }

      // fallback: look within same parent for subsequent text nodes
      const parent = createdNode.parentElement;
      if (parent) {
        const lines = textLines(parent);
        // find index of "Created by" and take next non-empty lines
        const idx = lines.findIndex(l => /Created by/i.test(l));
        if (idx >= 0) {
          const name = lines[idx + 1] || "Unknown";
          const handle = lines[idx + 2] || "";
          // handle sometimes is in parentheses or has @
          return { name: name || "Unknown", handle: handle || "" };
        }
      }
    }

    // 3) fallback: regex in whole card text - look for "Created by\nNAME\nHANDLE"
    const allText = card.innerText || "";
    const m = allText.match(/Created by[\s\n\r]+(.+?)(?:[\n\r]+(.+?))?(?:\n|$)/i);
    if (m) {
      const name = (m[1] || "Unknown").trim();
      const handle = (m[2] || "").trim();
      return { name, handle };
    }

    // 4) last resort: try to find "Created by" followed somewhere by a username in parentheses
    const m2 = allText.match(/Created by[\s\S]{0,200}?([A-Za-z0-9 _\-]{2,40})\s*\(?@?([A-Za-z0-9_\-]{1,40})?\)?/i);
    if (m2) {
      return { name: (m2[1] || "Unknown").trim(), handle: m2[2] ? "@" + m2[2].trim() : "" };
    }

    return { name: "Unknown", handle: "" };
  }

  // Extract top holders from the card: returns array [{name, percent}]
  function extractTopHolders(card) {
    if (!card) return [];

    // Find the "Top Holders" section
    let section = null;
    const nodes = Array.from(card.querySelectorAll("*"));
    for (const n of nodes) {
      if (/Top Holders/i.test(n.innerText || "") || /Top Holders/i.test(n.textContent || "")) {
        // prefer the nearest container that looks like the holders list (parent or grandparent)
        section = n.closest('div[data-slot="card-content"]') || n.parentElement || n;
        break;
      }
    }

    // If not found, search for a group that visually looks like "Top Holders" by nearby percents
    if (!section) {
      for (const n of nodes) {
        if ((n.innerText || "").includes("%") && (n.innerText || "").match(/\d+%/)) {
          section = n.closest('div[data-slot="card-content"]') || n.parentElement;
          break;
        }
      }
    }

    if (!section) section = card; // fallback to whole card

    // Collect candidate elements that contain a percent
    const percentElems = Array.from(section.querySelectorAll("*")).filter(el => /(\d+[\d.,]*)\s*%/.test(el.innerText || ""));
    const seen = new Set();
    const holders = [];

    for (const pe of percentElems) {
      // climb up until a meaningful container (but not beyond card)
      let container = pe;
      for (let i = 0; i < 6 && container && container !== card; i++) {
        // if container has some non-percent text and perhaps a username, stop
        const txt = (container.innerText || "").trim();
        const pctMatch = txt.match(/(\d+[\d.,]*)\s*%/);
        if (pctMatch && txt.replace(/(\d+[\d.,]*)\s*%/g, "").trim().length > 0) break;
        container = container.parentElement;
      }
      if (!container) container = pe;

      const txt = container.innerText || "";
      // get percent number (first match in txt)
      const pctMatch = txt.match(/(\d+[\d.,]*)\s*%/);
      if (!pctMatch) continue;
      const percent = parseFloat(pctMatch[1].replace(/,/g, "")) || 0;

      // attempt to find name in the container: look for lines that are not percent or $
      const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      // try to pick a line that doesn't contain % or $ or numbers only
      let name = "";
      for (const ln of lines) {
        if (/\d+%/.test(ln)) continue;
        if (/\$/.test(ln)) continue;
        // ignore the percent-only lines; choose a line with letters
        if (/[A-Za-z]/.test(ln) && ln.length <= 60) {
          name = ln;
          break;
        }
      }

      // fallback: the first line without percent
      if (!name) {
        for (const ln of lines) {
          if (!/^\s*[\d\$,.\%]+\s*$/.test(ln)) {
            name = ln;
            break;
          }
        }
      }

      // normalize name to avoid duplicates
      const nkey = normalize(name + "|" + percent);
      if (seen.has(nkey)) continue;
      seen.add(nkey);

      holders.push({ name: name || "Unknown", percent });
    }

    // sort by percent desc and return up to top 10 (we'll use top 3 later)
    holders.sort((a, b) => b.percent - a.percent);
    return holders.slice(0, 12);
  }

  /* ---------- Risk calculation & rendering ---------- */

  function calculateAndRender(card) {
    if (!card) return;

    // Extract data
    const creator = extractCreator(card);
    const holders = extractTopHolders(card);

    // Determine owner presence in top holders
    const ownerNameNormalized = normalize(creator.name);
    const top3 = holders.slice(0, 3);
    const ownerInTop3Index = top3.findIndex(h => normalize(h.name) === ownerNameNormalized);

    let ownerPercent = 0;
    if (ownerInTop3Index >= 0) {
      ownerPercent = top3[ownerInTop3Index].percent;
    } else {
      // maybe owner is elsewhere in holders list
      const ownerFull = holders.find(h => normalize(h.name) === ownerNameNormalized);
      if (ownerFull) ownerPercent = ownerFull.percent;
      else ownerPercent = 0;
    }

    // Start building reasons and points
    let points = 0;
    const reasons = [];

    // Owner risk (ownerPercent used)
    const oPts = ownerRisk(ownerPercent);
    points += oPts;
    reasons.push(`Owner owns ${ownerPercent}% → ${oPts >= 0 ? "+" : ""}${oPts} pts`);

    // If owner is not in top 3, user asked to "remove 4 risk points" (i.e., subtract 4)
    if (ownerInTop3Index === -1) {
      points -= 4;
      reasons.push("Owner not in top 3 → -4 pts");
    }

    // Top-3 holders evaluation (reduced scale)
    // We'll list top holders but skip showing the owner percent as a duplicate; if owner is in top, mark it.
    let displayedIndex = 0;
    for (let i = 0; i < Math.min(3, holders.length); i++) {
      const h = holders[i];
      if (normalize(h.name) === ownerNameNormalized) {
        reasons.push(`Top holder #${displayedIndex + 1} is the owner`);
      } else {
        const hp = holderRisk(h.percent);
        points += hp;
        reasons.push(`Top holder #${displayedIndex + 1} owns ${h.percent}% → ${hp >= 0 ? "+" : ""}${hp} pts`);
      }
      displayedIndex++;
    }

    // Massive imbalance check relative to the 3rd highest (or max other)
    const maxOther = holders.filter(h => normalize(h.name) !== ownerNameNormalized).reduce((m, h) => Math.max(m, h.percent), 0);
    // if owner dominates too much (difference > 50), discard negative points (set them to 0 in reasons and adjust points)
    if (ownerPercent - maxOther > 50) {
      // replace negative contributions with 0 points
      let adjustedPoints = 0;
      const newReasons = [];
      for (const r of reasons) {
        const m = r.match(/→\s*([+-]?[0-9]*\.?[0-9]+)\s*pts/);
        if (m) {
          const val = parseFloat(m[1]);
          if (val < 0) {
            newReasons.push(r.replace(/→\s*[+-]?[0-9]*\.?[0-9]+/, "→ 0"));
            // don't add negative
          } else {
            newReasons.push(r);
            adjustedPoints += val;
          }
        } else {
          newReasons.push(r);
        }
      }
      reasons.length = 0;
      reasons.push(...newReasons);
      points = adjustedPoints;
      reasons.push("Massive imbalance: owner dominates supply → negative (good) signals set to 0");
    }

    // Final risk level mapping
    let level = "NO RISK";
    if (points >= 6) level = "RISKY";
    else if (points >= 2) level = "LOW RISK";
    else if (points > 0) level = "MODERATE RISK";

    // Render card (insert above Buy button inside the same card)
    const existing = card.querySelector('[data-notallyhall="risk-card"]');
    if (existing) existing.remove();

    const box = document.createElement("div");
    box.setAttribute("data-notallyhall", "");
    box.setAttribute("data-notallyhall", "risk");
    box.setAttribute("data-notallyhall-id", "risk-card");
    box.dataset.notallyhall = "risk-card";
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

    const creatorText = creator.handle ? `${creator.name} (${creator.handle})` : creator.name || "Unknown";

    box.innerHTML = `
      <div style="font-weight:600;font-size:14px;margin-bottom:6px;">Coin Risk Analysis</div>
      <div style="font-size:13px;opacity:.9;margin-bottom:6px;">Creator: ${creatorText || "Unknown"}</div>
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

    // Insert above the buy button inside this card (prefer the enabled buy button)
    const buyBtn =
      card.querySelector('button[data-slot="button"]:not([disabled])') ||
      Array.from(card.querySelectorAll("button")).find(b => /buy/i.test(b.innerText || "")) ||
      card.querySelector("button");

    if (buyBtn && buyBtn.parentElement) {
      buyBtn.parentElement.insertBefore(box, buyBtn);
    } else {
      // fallback: put it at top of card content
      const content = card.querySelector('[data-slot="card-content"]') || card;
      content.insertBefore(box, content.firstChild);
    }
  }

  /* ---------- Watch & run ---------- */

  function tryRunOnce() {
    const card = findCoinCard();
    if (!card) return false;
    calculateAndRender(card);
    return true;
  }

  // Try immediately and a few times (page may render slowly)
  if (!tryRunOnce()) {
    const obs = new MutationObserver((mutations, o) => {
      if (tryRunOnce()) o.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: true });

    // safety: also attempt again after some delays
    setTimeout(() => tryRunOnce(), 1200);
    setTimeout(() => tryRunOnce(), 2500);
    setTimeout(() => tryRunOnce(), 5000);
  }
})();
