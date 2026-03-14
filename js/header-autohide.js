(function () {
  let lastY = window.scrollY || 0;
  let ticking = false;

  const SHOW_AT_TOP = 10;     // cerca del tope, siempre visible
  const DELTA = 8;            // mínimo cambio para considerar dirección

  function update() {
    const y = window.scrollY || 0;
    const diff = y - lastY;

    if (y <= SHOW_AT_TOP) {
      document.body.classList.remove("header-hidden");
    } else if (diff > DELTA) {
      // bajando
      document.body.classList.add("header-hidden");
    } else if (diff < -DELTA) {
      // subiendo
      document.body.classList.remove("header-hidden");
    }

    lastY = y;
    ticking = false;
  }

  window.addEventListener("scroll", function () {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
})();
