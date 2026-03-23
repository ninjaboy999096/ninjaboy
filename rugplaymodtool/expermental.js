(function messUpCoin() {
  const coin = document.querySelector('.coin.svelte-1y4vcqm');
  
  if (!coin) return;

  function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shouldApply(transform) {
    const match = transform.match(/rotateY\((\d+)deg\)/);
    if (!match) return false;
    const deg = parseInt(match[1]);
    return deg !== 0 && deg % 1800 === 0;
  }

  function applyRandomRotation() {
    const x = randomBetween(-36000, 36000);
    const y = randomBetween(-36000, 36000);
    const z = randomBetween(-36000, 36000);
    coin.style.transition = 'none';
    coin.style.transform = `rotateX(${x}deg) rotateY(${y}deg) rotateZ(${z}deg)`;
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.attributeName === 'style') {
        const transform = coin.style.transform;
        if (shouldApply(transform)) {
          applyRandomRotation();
        }
      }
    }
  });

  observer.observe(coin, { attributes: true });

  window._coinChaosStop = () => observer.disconnect();
})();
