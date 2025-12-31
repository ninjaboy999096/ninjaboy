// this script is made using ai
(function() {
  if (window.__RISK_ANALYSIS_RUN__) return;
  window.__RISK_ANALYSIS_RUN__ = true;

  /* ---------- small utils ---------- */
  const parsePercent = s => {
    if (!s) return 0;
    const m = String(s).match(/([\d,.]+)\s*%/);
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
      .replace(/\s+/g, " ")
      .toLowerCase();
  const round = (n, d = 2) => Math.round((n + Number.EPSILON) * 10 ** d) / 10 ** d;

  /* ---------- find coin card ---------- */
  function findCoinCard() {
    const cards = Array.from(document.querySelectorAll('div[data-slot="card"], section, article, div[class*="card"]'));
    for (const c of cards) {
      const txt = (c.innerText || "").slice(0, 6000);
      if (/Created by/i.test(txt) && (/\bBuy\b/i.test(txt) || /\bTrade\b/i.test(txt))) return c;
    }
    for (const c of cards) if (/Created by/i.test(c.innerText || "")) return c;
    for (const c of cards) if (/\bBuy\b/i.test(c.innerText || "") || /\bTrade\b/i.test(c.innerText || "")) return c;
    return null;
  }

  /* ---------- extract creator (robust) ---------- */
  function extractCreator(card) {
    try {
      if (!card) return { name: "Unknown", handle: "" };

      // 1) preferred: explicit hover-card trigger (site's user link)
      const hover = card.querySelector('a[data-slot="hover-card-trigger"], a[data-link-preview-trigger]');
      if (hover) {
        // Many variants: either inner span contains "Name (stuff) (@handle)"
        const span = hover.querySelector('span') || hover;
        const txt = (span.innerText || span.textContent || "").trim();
        if (txt) {
          // try to extract handle in parentheses or trailing @handle
          const handleMatch = txt.match(/@[\w-]+/);
          const handle = handleMatch ? handleMatch[0] : "";
          // remove handle part and trailing parentheses
          const name = txt.replace(/\(.*@[\w-]+.*\)/, "").replace(/@[\w-]+/, "").replace(/\(.*\)/, "").trim();
          return { name: name || "Unknown", handle: handle || "" };
        }
      }

      // 2) look for an element that says "Created by" and parse siblings
      const createdNode = Array.from(card.querySelectorAll("*")).find(n => /Created by/i.test(n.innerText || ""));
      if (createdNode) {
        // try nextElementSibling, then parent lines
        let node = createdNode.nextElementSibling;
        if (node && (node.innerText || "").trim()) {
          const lines = linesFrom(node);
          if (lines.length >= 1) {
            let nameLine = lines[0];
            let handleLine = lines[1] || "";
            const combined = nameLine.match(/^(.+?)\s*\(?@?([\w-]+)\)?$/);
            if (combined) return { name: combined[1].trim(), handle: "@" + combined[2].trim() };
            const hm = handleLine.match(/@[\w-]+/);
            return { name: nameLine.trim() || "Unknown", handle: hm ? hm[0] : handleLine.trim() };
          }
        }
        const parent = createdNode.parentElement;
        if (parent) {
          const lines = linesFrom(parent);
          const idx = lines.findIndex(l => /Created by/i.test(l));
          if (idx !== -1) {
            const nameRaw = lines[idx + 1] || "";
            const handleRaw = lines[idx + 2] || "";
            const combined = nameRaw.match(/^(.+?)\s*\(?@?([\w-]+)\)?$/);
            if (combined) return { name: combined[1].trim(), handle: "@" + combined[2].trim() };
            const hm = handleRaw.match(/@[\w-]+/);
            return { name: (nameRaw || "Unknown").trim(), handle: (hm ? hm[0] : (handleRaw || "").trim()) };
          }
        }
      }

      // 3) fallback: regex across the card
      const txt = card.innerText || card.textContent || "";
      const m = txt.match(/Created by[\s\r\n]+([^\r\n]+)(?:[\r\n]+([^\r\n]+))?/i);
      if (m) {
        const nameRaw = (m[1] || "").trim();
        const handleRaw = (m[2] || "").trim();
        const combined = nameRaw.match(/^(.+?)\s*\(?@?([\w-]+)\)?$/);
        if (combined) return { name: combined[1].trim(), handle: "@" + combined[2].trim() };
        const hm = handleRaw.match(/@[\w-]+/);
        return { name: (nameRaw || "Unknown"), handle: (hm ? hm[0] : (handleRaw || "")) };
      }

      return { name: "Unknown", handle: "" };
    } catch (e) {
      return { name: "Unknown", handle: "" };
    }
  }

  /* ---------- extract top holders (robust) ---------- */
  function extractTopHolders(card) {
    if (!card) return [];
    // find a node labeled "Top Holders" or similar
    const candidate = Array.from(card.querySelectorAll("*")).find(n => /\bTop Holders\b/i.test(n.innerText || "") || /\bTop Holders\b/i.test(n.textContent || ""));
    const root = candidate ? (candidate.closest('div[data-slot="card-content"]') || candidate.parentElement) : card;

    // collect small containers that contain a percent and not huge comment blocks
    const candidates = Array.from(root.querySelectorAll("*")).filter(el => {
      const txt = (el.innerText || el.textContent || "").trim();
      if (!/(\d+[\d.,]*)\s*%/.test(txt)) return false;
      if (txt.length > 1000) return false; // skip huge comment-like blocks
      // skip obvious comment blocks (heuristic)
      if (/\bago\b/i.test(txt) && /\d+h|\d+d/.test(txt)) return false;
      return true;
    });

    const seen = new Set();
    const holders = [];

    for (const el of candidates) {
      // climb up a bit to find a compact holder container
      let container = el;
      for (let i = 0; i < 5 && container && container !== root; i++) {
        const t = (container.innerText || "").trim();
        if (/\d+[\d.,]*\s*%/.test(t) && t.length < 800) break;
        container = container.parentElement;
      }
      if (!container) container = el;
      const txt = (container.innerText || "").trim();
      if (!txt || txt.length > 1000) continue;

      // extract percent
      const pctMatch = txt.match(/(\d+[\d.,]*)\s*%/);
      if (!pctMatch) continue;
      const percent = parseFloat(pctMatch[1].replace(/,/g, "")) || 0;

      // find a short name line (prefer lines before percent)
      const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      let name = "";
      // try lines that contain letters and are short
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

      const key = normalize(name) + "|" + percent;
      if (seen.has(key)) continue;
      seen.add(key);
      holders.push({ name: name.trim(), percent });
    }

    // sort descending and return
    holders.sort((a, b) => b.percent - a.percent);
    return holders.slice(0, 12);
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

    // match owner in holders (exact or contains)
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

    // fuzzy fallback: match first token
    if (ownerIndex === -1 && ownerNameNorm) {
      const first = ownerNameNorm.split(" ")[0];
      for (let i = 0; i < holders.length; i++) {
        const hNorm = normalize(holders[i].name || "");
        if (!hNorm) continue;
        if (hNorm.includes(first) || first.includes(hNorm)) {
          ownerPercent = holders[i].percent;
          ownerIndex = i;
          break;
        }
      }
    }

    // build reasons & compute points
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

    // Evaluate top-3 holders
    const top3 = holders.slice(0, 3);
    let displayPos = 0;
    for (let i = 0; i < top3.length; i++) {
      const h = top3[i];
      if (!h) continue;
      const hNorm = normalize(h.name || "");
      // if holder is owner, note it and DO NOT add its reduced score
      if (ownerIndex === i || hNorm === ownerNameNorm || (ownerHandleNorm && hNorm.includes(ownerHandleNorm))) {
        reasons.push(`Top holder #${displayPos + 1} is the owner`);
      } else {
        const hp = top3ScoreReduced(h.percent);
        points += hp;
        reasons.push(`Top holder #${displayPos + 1} owns ${h.percent}% → ${hp >= 0 ? "+" : ""}${hp} pts`);
      }
      displayPos++;
    }

    // Massive imbalance: if ownerPercent - maxOther > 50 then zero out negative reason values
    const maxOther = holders.filter((h, idx) => idx !== ownerIndex).reduce((m, h) => Math.max(m, h.percent || 0), 0);
    if (ownerPercent - maxOther > 50) {
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

    // insert above the buy button
    const allButtons = Array.from(card.querySelectorAll("button"));
    let buyBtn = allButtons.find(b => /\bBuy\b/i.test(b.innerText || b.textContent || "")) ||
                 allButtons.find(b => /\bTrade\b/i.test(b.innerText || b.textContent || "")) ||
                 allButtons[0];
    if (buyBtn && buyBtn.parentElement) {
      buyBtn.parentElement.insertBefore(box, buyBtn);
    } else {
      const content = card.querySelector('[data-slot="card-content"]') || card;
      content.insertBefore(box, content.firstChild);
    }
  }

  /* ---------- run & observe ---------- */
  function tryRunOnce() {
    const card = findCoinCard();
    if (!card) return false;
    try {
      calculateAndInsert(card);
    } catch (e) {
      // silently fail (no console)
    }
    return true;
  }

  if (!tryRunOnce()) {
    const mo = new MutationObserver((m, o) => {
      if (tryRunOnce()) o.disconnect();
    });
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(tryRunOnce, 900);
    setTimeout(tryRunOnce, 2200);
    setTimeout(tryRunOnce, 5200);
  }
})();
