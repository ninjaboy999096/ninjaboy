// this script is by ai
(() => {
  const PHRASE = "tally hall";

  // 1/2 chance ON LOAD to enable buy mode
  const BUY_MODE = Math.random() < 0.5;

  // Make "tally hall" match the length of the thing it replaces
  function fitPhrase(len) {
    let out = "";
    while (out.length < len) out += PHRASE;
    return out.slice(0, len);
  }

  function corruptText(text) {
    // Buy mode: replace "buy" anywhere, length-matched
    if (BUY_MODE) {
      text = text.replace(/buy/gi, match =>
        fitPhrase(match.length)
      );
    }

    // Chaos rule: 1/100 chance per word
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

  // Initial pass
  walk(document.body);

  // Keep applying to dynamic content
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
