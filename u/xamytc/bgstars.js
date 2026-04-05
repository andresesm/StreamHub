(function () {
  const root = document.getElementById('bgstars');
  if (!root) return;

  const starCount = window.innerWidth <= 768 ? 320 : 520;
  const baseDepth = 820;
  const depthVariance = 320;
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    star.className = 'bgstar';

    const scale = 0.25 + Math.random() * 1.15;
    const depth = baseDepth + Math.random() * depthVariance;
    const rotateY = Math.random() * 360;
    const rotateX = Math.random() * -55;
    const alpha = 0.35 + Math.random() * 0.65;

    star.style.opacity = alpha.toFixed(3);
    star.style.transformOrigin = `0 0 ${depth}px`;
    star.style.transform =
      `translate3d(0,0,-${depth}px) rotateY(${rotateY}deg) rotateX(${rotateX}deg) scale(${scale})`;

    fragment.appendChild(star);
  }

  root.replaceChildren(fragment);
})();