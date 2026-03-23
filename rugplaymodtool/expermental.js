(function messUpCoin() {
  const coin = document.querySelector('.coin.svelte-1y4vcqm');
  
  if (!coin) return;

  function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function applyRandomRotation() {
    const x = randomBetween(-36000, 36000);
    const y = randomBetween(-36000, 36000);
    const z = randomBetween(-36000, 36000);

    coin.style.transition = 'none';
    coin.style.transform = `rotateX(${x}deg) rotateY(${y}deg) rotateZ(${z}deg)`;

    window._coinChaos = setTimeout(applyRandomRotation, 50);
  }

  applyRandomRotation();
})();
