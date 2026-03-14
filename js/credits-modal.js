(function () {
  const openBtn = document.getElementById("footerCreditsBtn");
  const modal = document.getElementById("creditsModal");
  const closeBtn = document.getElementById("creditsCloseBtn");

  if (!openBtn || !modal || !closeBtn) return;

  function open() {
    modal.classList.add("is-visible");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    closeBtn.focus();
  }

  function close() {
    // Si el foco está dentro, sácalo antes de ocultar
    const active = document.activeElement;
    if (active && modal.contains(active)) openBtn.focus();

    modal.classList.remove("is-visible");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  openBtn.addEventListener("click", (e) => {
    e.preventDefault();
    open();
  });

  closeBtn.addEventListener("click", close);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-visible")) close();
  });
})();