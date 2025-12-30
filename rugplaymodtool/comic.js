// Comic Sans Everywhere Mod
// note: this mod was made by AI

(() => {
  // Prevent double-apply
  if (window.__comicSansModApplied) return;
  window.__comicSansModApplied = true;

  /* ---------- FORCE FONT ---------- */
  const style = document.createElement("style");
  style.textContent = `
    * {
      font-family: "Comic Sans MS", "Comic Sans", cursive !important;
    }
  `;
  document.head.appendChild(style);
})();
