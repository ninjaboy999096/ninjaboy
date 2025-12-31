(function() {
  function waitForPageLoad(timeout = 10000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const interval = setInterval(() => {
        // Check if the creator link exists
        const ownerEl = document.querySelector('a[data-slot="hover-card-trigger"] span.block.truncate');
        if (ownerEl) { clearInterval(interval); resolve(); }
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
      panel.style.top = "10px";
      panel.style.right = "10px";
      panel.style.background = "black";
      panel.style.color = "lime";
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
    // Grab the owner
    const ownerElement = document.querySelector('a[data-slot="hover-card-trigger"] span.block.truncate')?.innerText.trim() || "";

    // Grab top holders (adjust this selector to your actual top holder container/class)
    const topHolderElements = document.querySelectorAll("[data-top-holder], .top-holder, .holder"); 
    const topHolders = Array.from(topHolderElements)
                            .slice(0, 10)
                            .map(el => el.innerText.trim());

    injectDebugPanel(ownerElement, topHolders);
  }

  waitForPageLoad()
    .then(debugOwnerTopHolders)
    .catch(e => injectDebugPanel("Error: " + e, []));
})();
