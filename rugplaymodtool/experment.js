// this script is made using AI (debug panel: shows owner & top holders)

(function() {
  function waitForBuyButton(timeout = 10000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const interval = setInterval(() => {
        const buyBtn = [...document.querySelectorAll("button")].find(b => b.innerText.includes("Buy"));
        if (buyBtn) { clearInterval(interval); resolve(buyBtn); }
        if (Date.now() - start > timeout) { clearInterval(interval); reject("Buy button not found"); }
      }, 300);
    });
  }

  function injectDebugPanel(ownerText, topHolderTexts) {
    let panel = document.getElementById("risk-debug-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "risk-debug-panel";
      panel.style.position = "fixed";
      panel.style.bottom = "10px";
      panel.style.right = "10px";
      panel.style.background = "rgba(0,0,0,0.9)";
      panel.style.color = "lime";
      panel.style.fontFamily = "monospace";
      panel.style.fontSize = "12px";
      panel.style.padding = "10px";
      panel.style.zIndex = 999999;
      panel.style.maxWidth = "300px";
      panel.style.maxHeight = "400px";
      panel.style.overflowY = "auto";
      panel.style.border = "1px solid lime";
      document.body.appendChild(panel);
    }

    panel.innerHTML = `<b>Coin Risk Debug Panel</b><br><br>
      <b>Owner Raw Text:</b><br>${ownerText}<br><br>
      <b>Top Holders:</b><br>${topHolderTexts.map((t,i)=>`#${i+1}: ${t}`).join("<br>")}`;
  }

  function debugOwnerTopHolders() {
    const ownerElement = document.querySelector("[data-slot='card-content']")?.innerText || "";
    const topHolders = [...document.querySelectorAll("div[data-slot='card-content'] div")]
      .map(el => el.innerText)
      .filter(t => t.includes("%"));
    injectDebugPanel(ownerElement, topHolders);
  }

  waitForBuyButton().then(() => {
    debugOwnerTopHolders();
  }).catch(e => {
    injectDebugPanel("Error: " + e, []);
  });
})();
