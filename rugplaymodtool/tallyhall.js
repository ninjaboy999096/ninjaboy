// this script is ai
(() => {
  const PHRASE = "tally hall";

  // Rule 0: roll once on load (1/10 chance)
  const BUY_MODE = Math.random() < 0.1;

  function corruptText(text) {
    // Rule 1: conditional "buy" replacement
    if (BUY_MODE) {
      text = text.replace(/buy/gi, PHRASE);
    }

    // Rule 2: 1/100 chance per word to inject "tally hall"
    return text.replace(/\b\w+\b/g, word => {
      if (Math.random() < 0.01) {
        const cut = Math.floor(Math.random() * (word.length + 1));
        return PHRASE + word.slice(cut);
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

  // Initial pass
  walk(document.body);

  // Keep applying to new content
  const observer = new MutationObserver(mutations => {
    for (const m of mutations) {
      m.addedNodes.forEach(walk);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();

