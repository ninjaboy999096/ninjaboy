(() => {
  // Roll 1/10 chance
  const roll = Math.floor(Math.random() * 10) + 1;
  if (roll !== 1) return; // only activate if roll is 1

  console.log("Tally Hall mode activated!");

  // Function to replace "buy" with "tally hall" in text nodes
  function replaceText(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent = node.textContent.replace(/\bbuy\b/gi, "tally hall");
    } else {
      node.childNodes.forEach(replaceText);
    }
  }

  // Initial replacement on page load
  replaceText(document.body);

  // Observe future changes (dynamic content)
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(replaceText);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
