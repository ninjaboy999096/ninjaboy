(function () {
  const OLD_PATH = '/achievements/';
  const NEW_BASE = 'https://ninjaboy999096.vercel.app/rugplaymodtool/256%20achevments/';

  function replaceImages() {
    const imgs = document.querySelectorAll('img');
    let replaced = 0;

    imgs.forEach(img => {
      const src = img.getAttribute('src') || '';
      if (src.includes(OLD_PATH)) {
        const filename = src.split(OLD_PATH).pop();
        img.src = NEW_BASE + filename;
        replaced++;
      }
    });

    return replaced;
  }

  // Run immediately on load
  const count = replaceImages();
  console.log('[Achievement Replacer] Replaced ' + count + ' image(s) on load.');

  // Also watch for dynamically added images
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        const imgs = node.tagName === 'IMG' ? [node] : Array.from(node.querySelectorAll('img'));
        imgs.forEach(img => {
          const src = img.getAttribute('src') || '';
          if (src.includes(OLD_PATH)) {
            const filename = src.split(OLD_PATH).pop();
            img.src = NEW_BASE + filename;
            console.log('[Achievement Replacer] Replaced dynamic image: ' + filename);
          }
        });
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
