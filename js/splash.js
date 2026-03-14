(function () {
  const splash = document.getElementById("splashScreen");
  const app = document.getElementById("appContent");
  if (!splash || !app) return;

  // Si quieres que se muestre solo 1 vez por pestaña:
  // const SEEN_KEY = "vsd_splash_seen";
  // if (sessionStorage.getItem(SEEN_KEY) === "1") {
  //   splash.classList.remove("is-visible");
  //   splash.setAttribute("aria-hidden", "true");
  //   app.classList.remove("is-hidden-by-splash");
  //   return;
  // }

  // Bloquea scroll mientras está el splash
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  let closed = false;

  function closeSplash() {
    if (closed) return;
    closed = true;

    splash.classList.remove("is-visible");
    splash.setAttribute("aria-hidden", "true");
    app.classList.remove("is-hidden-by-splash");

    document.body.style.overflow = prevOverflow || "";

    // sessionStorage.setItem(SEEN_KEY, "1");

    removeListeners();
    // Luego de la animación, lo saco del flujo
    window.setTimeout(() => {
      splash.style.display = "none";
    }, 560);
  }

  function onFirstInteraction(evt) {
    // Si el usuario clickea y arrastra scroll, igual cuenta.
    closeSplash();
  }

  const opts = { passive: true };
  const events = ["pointerdown", "keydown", "wheel", "touchstart"];
  function addListeners() {
    events.forEach(ev => window.addEventListener(ev, onFirstInteraction, opts));
  }
  function removeListeners() {
    events.forEach(ev => window.removeEventListener(ev, onFirstInteraction, opts));
  }

  // Muestra splash al inicio
  splash.classList.add("is-visible");
  app.classList.add("is-hidden-by-splash");
  addListeners();
})();
