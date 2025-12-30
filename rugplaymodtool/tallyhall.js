// this script is by ai
(() => {
  const PHRASE = "tally hall";
  const BUY_MODE = Math.random() < 0.5;

  function fitPhrase(len) {
    let out = "";
    while (out.length < len) out += PHRASE;
    return out.slice(0, len);
  }

  function corruptText(text) {
    // BUY MODE
    if (BUY_MODE) {
      text = text.replace(/buy/gi, "tally hall");
    }

    // CHAOS MODE: 1/100 per word
    return text.replace(/\b\w+\b/g, word => {
      if (Math.random() < 0.01) {
        return fitPhrase(word.length);
      }
      return word;
    });
  }

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent = corruptText(node.textContent);
      return;
    }

    if (
      node.nodeType === Node.ELEMENT_NODE &&
      !["SCRIPT", "STYLE", "INPUT", "TEXTAREA"].includes(node.tagName)
    ) {
      node.childNodes.forEach(walk);
    }
  }

  let running = false;

  function apply() {
    if (running) return;
    running = true;
    walk(document.body);
    running = false;
  }

  // Wait until real content exists
  const wait = setInterval(() => {
    if (document.body && document.body.innerText.length > 500) {
      clearInterval(wait);
      apply();
    }
  }, 200);

  // Catch SPA re-renders
  const observer = new MutationObserver(() => {
    apply();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
