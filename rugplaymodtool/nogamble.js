// Gambling Block Mod
(() => {
  const GAMBLING_PATH = "/gambling";

  /* ---------- REMOVE GAMBLING SIDEBAR BUTTON ---------- */
  function removeGamblingButton() {
    document.querySelectorAll('a[href="/gambling"]').forEach(a => a.remove());
  }

  /* ---------- SHOW NO GAMBLING MESSAGE ---------- */
  function showNoGambling() {
    if (document.getElementById("no-gambling-banner")) return;

    const banner = document.createElement("div");
    banner.id = "no-gambling-banner";
    banner.textContent = "no gambling";

    banner.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 999999;
      background: black;
      color: white;
      font-size: 48px;
      font-weight: bold;
      padding: 30px 40px;
      border-radius: 16px;
      border: 3px solid white;
      text-align: center;
      pointer-events: none;
    `;

    document.body.appendChild(banner);
  }

  /* ---------- MAIN LOOP ---------- */
  function tick() {
    removeGamblingButton();

    if (location.pathname.startsWith(GAMBLING_PATH)) {
      showNoGambling();
    }
  }

  // Initial run
  tick();

  // Catch late-loaded UI
  setTimeout(tick, 1000);

  // Keep enforcing (SPA-safe)
  setInterval(tick, 1000);
})();
