// this script is by ai
(() => {
  // 🔒 hard lock so it can never run twice
  if (window.__TALLY_RAN__) return;
  window.__TALLY_RAN__ = true;

  const PHRASE = "tally hall";

  // 50/50 chance on load to enable buy mode
  const BUY_MODE = Math.random() < 0.5;

  // length-matched version (USED ONLY FOR CHAOS)
  function fitPhrase(len) {
    let out = "";
    while (out.length < len) out += PHRASE;
    return out.slice(0, len);
  }

  function corruptText(text) {
    let result = text;

    // ✅ BUY MODE — NOT length matched
    if (BUY_MODE) {
      result = result.replace(/\bbuy\b/gi, "tally hall");
    }

    // ✅ CHAOS MODE — 1% per word, length matched
    result = result.replace(/\b\w+\b/g, word => {
      if (Math.random() < 0.01) {
        return fitPhrase(word.length);
      }
      return word;
    });

    return result;
  }

  function walkOnce(root) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent) continue;

      if (
        ["SCRIPT", "STYLE", "INPUT", "TEXTAREA"].includes(parent.tagName)
      ) continue;

      if (!node.textContent.trim()) continue;

      node.textContent = corruptText(node.textContent);
    }
  }

  function run() {
    walkOnce(document.body);
    console.log("[tally] done | buy mode:", BUY_MODE);
  }

  // ⏱️ wait for load + 2 seconds, then run ONCE
  if (document.readyState === "complete") {
    setTimeout(run, 2000);
  } else {
    window.addEventListener("load", () => {
      setTimeout(run, 2000);
    });
  }
})();
