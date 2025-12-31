(function() {
  function waitForPageLoad(timeout = 10000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const interval = setInterval(() => {
        // Adjust selector to match the real coin owner card/container
        const ownerCard = document.querySelector(".coin-owner, .creator-info");
        if (ownerCard) { clearInterval(interval); resolve(); }
        if (Date.now() - start > timeout) { clearInterval(interval); reject("Page load timeout"); }
      }, 300);
    });
  }

  function injectDebugPanel(ownerText, topHolderTexts) {
    let panel = document.getElementById("risk-debug-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "risk-debug-panel";
      panel.style.position = "fixed";
      panel.style.top = "10px";        // top-right corner
      panel.style.right = "10px";
      panel.style.background = "black"; // dark background for readability
      panel.style.color = "lime";      // green text
      panel.style.fontFamily = "monospace";
      panel.style.fontSize = "12px";
      panel.style.padding = "10px";
      panel.style.zIndex = 999999;
      panel.style.maxWidth = "350px";
      panel.style.maxHeight = "400px";
      panel.style.overflowY = "auto";
      panel.style.border = "1px solid lime";
      document.body.appendChild(panel);
    }

    panel.innerHTML = `<b>Coin Risk Debug Panel</b><br><br>
      <b>Owner Raw Text:</b><br>${ownerText || "(none found)"}<br><br>
      <b>Top Holders:</b><br>${topHolderTexts.map((t,i)=>`#${i+1}: ${t}`).join("<br>")}`;
  }

  function debugOwnerTopHolders() {
    // Correctly select only the owner container
    const ownerElement = document.querySelector(".coin-owner, .creator-info")?.innerText || "";
    
    // Only grab top holders, avoiding comments and other unrelated text
    const topHolderElements = document.querySelectorAll(".top-holder"); // adjust to real class
    const topHolders = Array.from(topHolderElements).map(el => el.innerText.trim());

    injectDebugPanel(ownerElement, topHolders);
  }

  waitForPageLoad()
    .then(debugOwnerTopHolders)
    .catch(e => injectDebugPanel("Error: " + e, []));
})();
