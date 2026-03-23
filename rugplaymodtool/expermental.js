(function messUpCoin() {
  const coin = document.querySelector('.coin.svelte-1y4vcqm');
  
  if (!coin) return;

  let lastKnownDeg = 0;

  function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function applyRandomRotation() {
    const x = randomBetween(-36000, 36000);
    const y = randomBetween(-36000, 36000);
    const z = randomBetween(-36000, 36000);
    coin.style.transition = 'none';
    coin.style.transform = `rotateX(${x}deg) rotateY(${y}deg) rotateZ(${z}deg)`;
  }

  const observer = new MutationObserver(() => {
    const transform = coin.getAttribute('style') || '';
    const match = transform.match(/rotateY\(([\d.]+)deg\)/);
    if (!match) return;
    const deg = parseFloat(match[1]);
    if (deg !== lastKnownDeg) {
      lastKnownDeg = deg;
      if (deg !== 0 && deg % 1800 === 0) {
        applyRandomRotation();
      }
    }
  });

  observer.observe(coin, { attributes: true, attributeFilter: ['style'] });

  window._coinChaosStop = () => observer.disconnect();
})();
