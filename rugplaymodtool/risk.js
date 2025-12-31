// this script is made using AI
(() => {
  if (window.__RISK_ANALYSIS_RUN__) return;
  window.__RISK_ANALYSIS_RUN__ = true;

  /* ---------- config ---------- */
  const SHOW_DEBUG_PANEL = true; // flip to false to hide debug info
  const DEBUG_ID = "risk-debug-panel-notallyhall"; // uses data-notallyhall to avoid "tally hall" script

  /* ---------- small utils ---------- */
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
      .replace(/\s+/g, " ")
      .toLowerCase();
  const round = (n, d = 2) => Math.round((n + Number.EPSILON) * 10 ** d) / 10 ** d;

  /* ---------- debug panel ---------- */
  function injectDebugPanel(ownerRaw, candidateOwnerAnchors, holderCandidates, chosenHolders) {
    if (!SHOW_DEBUG_PANEL) return;
    try {
      let panel = document.getElementById(DEBUG_ID);
      if (!panel) {
        panel = document.createElement("div");
        panel.id = DEBUG_ID;
        panel.setAttribute("data-notallyhall", "debug");
        Object.assign(panel.style, {
          position: "fixed",
          top: "10px",
          right: "10px",
          background: "rgba(12,12,14,0.95)",
          color: "#e6e6e6",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', monospace",
          fontSize: "12px",
          padding: "10px",
          zIndex: 9999999,
          maxWidth: "420px",
          maxHeight: "60vh",
          overflowY: "auto",
          border: "1px solid rgba(120,120,140,0.25)",
          borderRadius: "8px",
          boxShadow: "0 6px 18px rgba(0,0,0,0.6)",
          lineHeight: "1.2",
          userSelect: "text"
        });
        document.body.appendChild(panel);
      }

      const mkList = arr => (arr && arr.length ? arr.map((t,i) => `<div style="margin-bottom:6px"><b>#${i+1}:</b> <code style="white-space:pre-wrap">${escapeHtml(t)}</code></div>`).join("") : "<div>(none)</div>");

      panel.innerHTML = `
        <div style="font-weight:700;margin-bottom:8px">Coin Risk Debug Panel</div>

        <div style="margin-bottom:6px"><b>Owner Raw Text:</b><div style="margin-top:4px"><code style="white-space:pre-wrap">${escapeHtml(ownerRaw || "(none)")}</code></div></div>

        <div style="margin-bottom:6px"><b>Candidate owner anchors near 'Created by':</b>${mkList(candidateOwnerAnchors)}</div>

        <div style="margin-bottom:6px"><b>Holder candidate blocks (short):</b>${mkList(holderCandidates)}</div>

        <div style="margin-bottom:6px"><b>Chosen top holders (parsed):</b>${(chosenHolders && chosenHolders.length) ? chosenHolders.map((h,i)=>`<div>#${i+1}: ${escapeHtml(h.name)} — ${h.percent}%</div>`).join("") : "<div>(none)</div>"}</div>
      `;
    } catch (e) {
      // silent
    }
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  /* ---------- find coin card ---------- */
  function findCoinCard() {
    // try a few heuristics: cards, sections, articles
    const selectors = ['div[data-slot="card"]', "section", "article", 'div[class*="card"]'];
    const nodes = Array.from(document.querySelectorAll(selectors.join(",")));
    // prefer ones that include Created by or Buy/Trade buttons
    for (const n of nodes) {
      const txt = (n.innerText || "").slice(0, 8000);
      if (/Created by/i.test(txt) && (/\bBuy\b/i.test(txt) || /\bTrade\b/i.test(txt) || /\bBuy\b/i.test(txt))) return n;
    }
    // fallback: any with Created by
    for (const n of nodes) if (/Created by/i.test(n.innerText || "")) return n;
    // fallback: any with Buy/Trade text
    for (const n of nodes) if (/\bBuy\b/i.test(n.innerText || "") || /\bTrade\b/i.test(n.innerText || "")) return n;
    // final fallback: big header area (common pattern)
    const header = document.querySelector("header");
    if (header && (/\bCreated by\b/i.test(header.innerText || "") || /\bTop Holders\b/i.test(header.innerText || ""))) return header;
    return null;
  }

  /* ---------- extract creator (more robust) ---------- */
  function extractCreator(card) {
    try {
      if (!card) return { name: "Unknown", handle: "" };

      // 1) look for 'Created by' node
      const createdNode = Array.from(card.querySelectorAll("*")).find(n => /\bCreated by\b/i.test(n.innerText || n.textContent || ""));
      let ownerRaw = "";
      const candidateAnchors = [];

      if (createdNode) {
        // search nearby for anchors that look like the creator link
        // first: direct nextElementSibling anchor
        let a = createdNode.nextElementSibling && createdNode.nextElementSibling.tagName === "A" ? createdNode.nextElementSibling : null;
        if (a) candidateAnchors.push(a.innerText || a.textContent || "");
        // then: any anchor within the same parent
        const parent = createdNode.parentElement;
        if (parent) {
          const anchors = Array.from(parent.querySelectorAll("a"));
          for (const anc of anchors) {
            const txt = (anc.innerText || anc.textContent || "").trim();
            if (txt) {
              candidateAnchors.push(txt);
              if (/@[\w-]+/.test(txt) || /\(/.test(txt) || txt.split(" ").length <= 6) {
                // prefer one that has @ or parentheses
                a = anc;
                break;
              }
            }
          }
        }
        // if still not found, look within card for anchors near top (likely creator link)
        if (!a) {
          const anchors = Array.from(card.querySelectorAll("a"));
          for (const anc of anchors) {
            const txt = (anc.innerText || anc.textContent || "").trim();
            if (!txt) continue;
            // prefer anchors that include @handle or look like "name (" or have avatar child
            if (/@[\w-]+/.test(txt) || anc.querySelector("img") || /\(@/.test(txt)) {
              a = anc;
              candidateAnchors.push(txt);
              break;
            }
          }
        }

        if (a) {
          ownerRaw = (a.innerText || a.textContent || "").trim();
        } else {
          // fallback: parent text lines (next lines after 'Created by')
          const pLines = linesFrom(createdNode.parentElement || createdNode);
          const idx = pLines.findIndex(l => /\bCreated by\b/i.test(l));
          if (idx !== -1) {
            ownerRaw = pLines[idx + 1] || pLines[idx + 2] || "";
          }
        }
      } else {
        // no explicit "Created by" node; try header area at top of card
        const headerLike = card.querySelector("header") || card.querySelector("div");
        ownerRaw = (headerLike && headerLike.innerText && headerLike.innerText.split(/\r?\n/).slice(0, 6).join(" ").trim()) || "";
      }

      // keep candidateAnchors unique short list
      const candidateAnchorsUniq = [...new Set(candidateAnchors)].slice(0,5);

      // now parse ownerRaw for name + handle
      let name = "Unknown", handle = "";

      if (ownerRaw) {
        // try to find handle first
        const hm = ownerRaw.match(/@[\w-]+/);
        if (hm) handle = hm[0];
        // remove parentheses segments that contain @handle
        let cleaned = ownerRaw.replace(/\([^\)]*@[\w-]+[^\)]*\)/g, "").replace(/@[\w-]+/g, "").trim();
        // remove trailing parentheses and phrases like "(tally hall ...)"
        cleaned = cleaned.replace(/\(.*?\)/g, "").trim();
        // if cleaned is long, try first two words (name)
        const words = cleaned.split(/\s+/).filter(Boolean);
        if (words.length >= 1) {
          name = words.slice(0, Math.min(3, words.length)).join(" ").trim();
        }
        // if name still looks like handle or empty, fallback to first part before '('
        if (!name || /^@/.test(name)) {
          const m2 = ownerRaw.match(/^([^(@\n]+)/);
          if (m2) name = m2[1].trim();
        }
      }

      // If parsing fails, try candidate anchors raw text (first good one)
      if ((name === "Unknown" || !name) && candidateAnchorsUniq.length) {
        const cand = candidateAnchorsUniq[0];
        const hm = cand.match(/@[\w-]+/);
        if (hm) handle = handle || hm[0];
        let cleaned = cand.replace(/\(.*?\)/g, "").replace(/@[\w-]+/g, "").trim();
        const words = cleaned.split(/\s+/).filter(Boolean);
        if (words.length) name = words.slice(0, Math.min(3, words.length)).join(" ");
      }

      // final fallback: try card text regex
      if ((!name || name === "Unknown") && card.innerText) {
        const m = card.innerText.match(/Created by[\s\r\n]+([^\r\n]+)(?:[\r\n]+([^\r\n]+))?/i);
        if (m) {
          const nRaw = (m[1] || "").trim();
          const hRaw = (m[2] || "").trim();
          const hm = nRaw.match(/@[\w-]+/) || hRaw.match(/@[\w-]+/);
          if (hm) handle = handle || hm[0];
          name = name === "Unknown" ? (nRaw.replace(/@[\w-]+/g, "").replace(/\(.*\)/g, "").trim() || "Unknown") : name;
        }
      }

      // return normalized results
      return {
        name: name || "Unknown",
        handle: handle || "",
        raw: ownerRaw || "",
        candidateAnchors: candidateAnchorsUniq
      };
    } catch (e) {
      return { name: "Unknown", handle: "", raw: "", candidateAnchors: [] };
    }
  }

  /* ---------- extract top holders (improved) ---------- */
  function extractTopHolders(card) {
    try {
      if (!card) return [];

      // 1) find a "Top Holders" label or similar
      const topLabel = Array.from(card.querySelectorAll("*")).find(n => /\bTop Holders\b/i.test(n.innerText || n.textContent || ""));
      const root = topLabel ? (topLabel.closest('div[data-slot="card-content"]') || topLabel.parentElement) : card;

      // 2) gather candidate small containers that include a percent and some letters, but are not huge
      const candidates = Array.from(root.querySelectorAll("*")).filter(el => {
        const txt = (el.innerText || el.textContent || "").trim();
        if (!txt) return false;
        if (!/(\d+[\d.,]*)\s*%/.test(txt)) return false;
        if (txt.length > 900) return false; // skip huge blocks (likely comments)
        // skip obvious comment/transaction rows that include "ago" time tokens
        if (/\bago\b/i.test(txt) && /\d+\s*(h|d|m)\b/i.test(txt)) return false;
        return true;
      });

      // build small text previews for debug and parsing
      const previews = [];
      const seen = new Set();
      const holders = [];

      for (const el of candidates) {
        // climb up a bit to find more compact holder row
        let container = el;
        for (let i = 0; i < 5 && container && container !== root; i++) {
          const t = (container.innerText || "").trim();
          if (/\d+[\d.,]*\s*%/.test(t) && t.length < 900) break;
          container = container.parentElement;
        }
        if (!container) container = el;
        const txt = (container.innerText || "").trim();
        if (!txt) continue;
        // preview shortened
        previews.push(txt.length > 240 ? txt.slice(0, 240) + "…" : txt);

        // extract percent
        const pctMatch = txt.match(/(\d+[\d.,]*)\s*%/);
        if (!pctMatch) continue;
        const percent = parseFloat(pctMatch[1].replace(/,/g, "")) || 0;

        // guess name: prefer first short line that contains letters and is not a $ or percent line
        const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        let name = "";
        for (const ln of lines) {
          if (/\d+[\d.,]*\s*%/.test(ln)) continue;
          if (/^\$/.test(ln)) continue;
          // line that contains @ or letters and reasonable length
          if (/[A-Za-z]/.test(ln) && ln.length <= 60) {
            name = ln;
            break;
          }
        }
        if (!name) {
          // fallback: take any chunk before the percent
          const before = txt.split(/(\d+[\d.,]*\s*%)/)[0] || "";
          const candidate = before.split(/\r?\n/).reverse().find(l => /[A-Za-z]/.test(l));
          name = (candidate || before).trim();
        }
        if (!name) name = "Unknown";

        const key = normalize(name) + "|" + percent;
        if (seen.has(key)) continue;
        seen.add(key);
        holders.push({ name: name.replace(/\s+/g, " ").trim(), percent });
      }

      // sort by percent desc and trim
      holders.sort((a,b)=>b.percent - a.percent);
      const chosen = holders.slice(0, 12); // keep for debug
      return { chosen, previews };
    } catch (e) {
      return { chosen: [], previews: [] };
    }
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

    const creatorInfo = extractCreator(card);
    const topExtract = extractTopHolders(card);
    const holders = topExtract.chosen || [];
    const previewBlocks = topExtract.previews || [];

    // debug panel
    injectDebugPanel(creatorInfo.raw || `${creatorInfo.name} ${creatorInfo.handle}` , creatorInfo.candidateAnchors || [], previewBlocks, holders.slice(0,6));

    const ownerNameNorm = normalize(creatorInfo.name || "");
    const ownerHandleNorm = normalize(creatorInfo.handle || "");
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

    // allow additional fallback: if owner handle present, try matching anchor text in card
    if (ownerIndex === -1 && creatorInfo.handle) {
      const allAnchors = Array.from(card.querySelectorAll("a"));
      for (let i = 0; i < holders.length; i++) {
        const hText = holders[i].name.toLowerCase();
        for (const anc of allAnchors) {
          const txt = (anc.innerText || anc.textContent || "").toLowerCase();
          if (txt.includes(hText) && txt.includes(creatorInfo.handle.toLowerCase())) {
            ownerPercent = holders[i].percent;
            ownerIndex = i;
            break;
          }
        }
        if (ownerIndex !== -1) break;
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

    const creatorDisplay = (creatorInfo.name ? creatorInfo.name : "Unknown") + (creatorInfo.handle ? ` (${creatorInfo.handle})` : "");
    box.innerHTML = `
      <div style="font-weight:600;font-size:14px;margin-bottom:6px;">Coin Risk Analysis</div>
      <div style="font-size:13px;opacity:.9;margin-bottom:6px;">Creator: ${escapeHtml(creatorDisplay || "Unknown")}</div>
      <div style="font-size:13px;margin-bottom:6px;">
        <b>Risk Points:</b> ${round(points, 2)}<br>
        <b>Risk Level:</b> ${level}
      </div>
      <div style="font-size:12px;opacity:.85;">
        <b>Reasons:</b>
        <ul style="margin:6px 0 0 16px;padding:0;">
          ${reasons.map(r => `<li>${escapeHtml(r)}</li>`).join("")}
        </ul>
      </div>
    `;

    // insert above the buy button (prefer non-disabled buy button)
    const allButtons = Array.from(card.querySelectorAll("button"));
    let buyBtn = allButtons.find(b => /\bBuy\b/i.test(b.innerText || b.textContent || "")) ||
                 allButtons.find(b => /\bTrade\b/i.test(b.innerText || b.textContent || "")) ||
                 allButtons.find(b => !b.disabled) ||
                 allButtons[0];

    if (buyBtn && buyBtn.parentElement) {
      buyBtn.parentElement.insertBefore(box, buyBtn);
    } else {
      const content = card.querySelector('[data-slot="card-content"]') || card;
      content.insertBefore(box, content.firstChild);
    }
  }

  /* ---------- runner & observer ---------- */
  function tryRunOnce() {
    const card = findCoinCard();
    if (!card) return false;
    try {
      calculateAndInsert(card);
    } catch (e) {
      // fail quietly; debug panel should show what's being read
    }
    return true;
  }

  if (!tryRunOnce()) {
    const mo = new MutationObserver((m, o) => {
      if (tryRunOnce()) o.disconnect();
    });
    mo.observe(document.body, { childList: true, subtree: true });
    // extra retries
    setTimeout(tryRunOnce, 900);
    setTimeout(tryRunOnce, 2200);
    setTimeout(tryRunOnce, 5200);
  }
})();
