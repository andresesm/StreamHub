(function () {
  const root = document.documentElement;

  function px(n) {
    return `${Math.max(0, Math.round(n))}px`;
  }

  function setOffsets() {
    const header = document.querySelector(".site-header");
    const filtersBar = document.querySelector(".filters-bar");
    const filtersSection = document.querySelector(".filters-section");

    const headerH = header ? header.offsetHeight : 0; // alto real [web:344]

    // Solo barra visible (no panel)
    let filtersH = filtersBar ? filtersBar.offsetHeight : 0; // [web:344]

    // Suma padding vertical de la sección fija
    if (filtersSection) {
      const cs = getComputedStyle(filtersSection);
      filtersH += parseFloat(cs.paddingTop) || 0;
      filtersH += parseFloat(cs.paddingBottom) || 0;
    }

    root.style.setProperty("--site-header-real-h", px(headerH));
    root.style.setProperty("--site-header-h", px(headerH));  // “efectivo” (lo bajamos a 0 vía body.header-hidden)
    root.style.setProperty("--filters-h", px(filtersH));
  }

  window.addEventListener("DOMContentLoaded", setOffsets);
  window.addEventListener("load", setOffsets);
  window.addEventListener("resize", setOffsets);
  window.addEventListener("orientationchange", setOffsets);
})();