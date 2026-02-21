(function () {
  const openBtn = document.getElementById("footerCreditsBtn");
  const modal = document.getElementById("creditsModal");
  const closeBtn = document.getElementById("creditsCloseBtn");

  if (!openBtn || !modal || !closeBtn) return;

  function open() {
    modal.classList.add("is-visible");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open"); // opcional si luego quieres blur al fondo
    closeBtn.focus();
  }

  function close() {
    modal.classList.remove("is-visible");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    openBtn.focus();
  }

  openBtn.addEventListener("click", (e) => {
    e.preventDefault();
    open();
  });

  closeBtn.addEventListener("click", close);

  modal.addEventListener("click", (e) => {
    // click en el backdrop cierra
    if (e.target === modal) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-visible")) close();
  });
})();
