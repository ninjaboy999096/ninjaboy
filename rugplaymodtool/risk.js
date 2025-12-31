// this script is made using ai

(() => {
  const STATE = { rendered: false };

  const norm = s =>
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9@]/g, "")
      .trim();

  function findCard() {
    return [...document.querySelectorAll("div")]
      .find(d => d.innerText?.includes("Created by") && d.innerText?.includes("Buy"));
  }

  function getCreator(card) {
    const lines = card.innerText.split("\n").map(l => l.trim()).filter(Boolean);
    const i = lines.findIndex(l => l.toLowerCase() === "created by");
    if (i === -1) return null;

    const name = lines[i + 1] || "";
    const handle = lines[i + 2]?.match(/@\w+/)?.[0] || "";
    return { name, handle };
  }

  function getHolders(card) {
    const out = [];
    const nodes = [...card.querySelectorAll("*")];

    for (const n of nodes) {
      const txt = n.innerText;
      if (!txt || !txt.includes("%")) continue;
      if (!/[a-z]/i.test(txt)) continue;

      const m = txt.match(/([\d.]+)\s*%/);
      if (!m) continue;

      const percent = parseFloat(m[1]);
      if (percent <= 0) continue;

      const nameLine = txt.split("\n").find(l => /[a-z]/i.test(l) && !l.includes("%"));
      if (!nameLine) continue;

      out.push({ name: nameLine.trim(), percent });
    }

    return out
      .filter((v, i, a) => a.findIndex(x => x.name === v.name) === i)
      .sort((a, b) => b.percent - a.percent);
  }

  function scoreOwner(p) {
    if (p <= 20) return -4;
    if (p <= 40) return -2;
    if (p <= 60) return 0;
    if (p <= 80) return 5;
    return 10;
  }

  function render(card, creator, ownerPct, points, reasons) {
    card.querySelector("[data-risk]")?.remove();

    const box = document.createElement("div");
    box.dataset.risk = "true";
    box.style = `
      margin-bottom:12px;
      padding:12px;
      border-radius:10px;
      background:#0f0f14;
      color:#eaeaf0;
      border:1px solid #2a2a35;
    `;

    box.innerHTML = `
      <b>Coin Risk Analysis</b><br>
      Creator: ${creator.name} ${creator.handle || ""}<br><br>
      <b>Risk Points:</b> ${points}<br>
      <b>Risk Level:</b> ${points >= 6 ? "RISKY" : points >= 2 ? "LOW RISK" : "NO RISK"}<br><br>
      <b>Reasons:</b>
      <ul>${reasons.map(r => `<li>${r}</li>`).join("")}</ul>
    `;

    const buy = [...card.querySelectorAll("button")]
      .find(b => /buy/i.test(b.innerText));
    buy?.parentElement.insertBefore(box, buy);
  }

  function run() {
    const card = findCard();
    if (!card) return;

    const creator = getCreator(card);
    const holders = getHolders(card);

    if (!creator || holders.length < 1) return;

    const owner = holders.find(h =>
      norm(h.name).includes(norm(creator.name)) ||
      norm(h.name).includes(norm(creator.handle))
    );

    if (!owner) return;

    let points = 0;
    const reasons = [];

    const op = scoreOwner(owner.percent);
    points += op;
    reasons.push(`Owner owns ${owner.percent}% → ${op} pts`);

    const top3 = holders.slice(0, 3).filter(h => h !== owner);
    for (let i = 0; i < top3.length; i++) {
      const p = top3[i].percent <= 20 ? -0.5 :
                top3[i].percent <= 40 ? -0.25 :
                top3[i].percent <= 60 ? 0 :
                top3[i].percent <= 80 ? 0.5 : 1;
      points += p;
      reasons.push(`Top holder #${i + 1} owns ${top3[i].percent}% → ${p} pts`);
    }

    render(card, creator, owner.percent, points, reasons);
    STATE.rendered = true;
  }

  const obs = new MutationObserver(run);
  obs.observe(document.body, { childList: true, subtree: true });
  setInterval(run, 1000);
})();
