const EXPAND_TRANSITION_TIME = 600;

class TCGCard extends HTMLElement {
    constructor() {
        super();

        const template = document.createElement("template");
        template.innerHTML = `
<style>
:host {
  display: block;
  width: 100%;
  min-width: 0;
  position: relative;
  --pointer-x: 50%;
  --pointer-y: 50%;
  --glare-opacity: 0;
  --border-radius: var(--card-border-radius, 5%);
  --card-aspect-ratio: 733 / 1024;
  pointer-events: none;
}

.tcg-wrapper {
  width: min(320px, 100%);
  aspect-ratio: var(--card-aspect-ratio, 733 / 1024);
  position: relative;
  display: block;
  border-radius: var(--border-radius);
  overflow: visible;
  margin-inline: auto;
}

.tcg-proxy {
  width: 100%;
  height: 100%;
  aspect-ratio: var(--card-aspect-ratio, 733 / 1024);
  pointer-events: none;
  position: relative;
  overflow: hidden;
  border-radius: var(--border-radius);
}

.tcg-proxy::after {
  content: "";
  position: absolute;
  inset: 10px;
  border-radius: calc(var(--border-radius) - 10px);
  background-color: rgba(0, 0, 0, 0.4);
  border: 2px solid rgba(0, 0, 0, 0.5);
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  background-blend-mode: screen;
  filter: saturate(0) opacity(0.1);
  pointer-events: none;
}

.tcg-display {
  pointer-events: auto;
  cursor: pointer;
  border: none;
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: none;
  margin: 0;
  padding: 0;
  border-radius: var(--border-radius);
  filter: drop-shadow(0 8px 20px rgb(0 0 0 / 0.22)) drop-shadow(0 4px 8px rgb(0 0 0 / 0.14));
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
  transform: perspective(1200px) rotateX(0deg) rotateY(0deg) rotateZ(0deg);
  transition: transform 250ms ease, filter 220ms ease;
}

.tcg-card {
  display: block;
  width: 100%;
  height: 100%;
  max-width: 100%;
  object-fit: contain;
  border-radius: var(--border-radius);
}

.tcg-shine {
  position: absolute;
  inset: 0;
  border-radius: var(--border-radius);
}

.tcg-glare {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(
    farthest-corner circle at var(--pointer-x) var(--pointer-y),
    hsla(0, 0%, 100%, 0.8) 10%,
    hsla(0, 0%, 100%, 0.65) 20%,
    hsla(0, 0%, 0%, 0.5) 90%
  );
  mix-blend-mode: overlay;
  opacity: var(--glare-opacity);
  transition: opacity 500ms ease-out;
  border-radius: var(--border-radius);
}

@media (max-width: 640px) {
  .tcg-wrapper {
    width: min(260px, 100%);
  }
}
</style>

<div class="tcg-wrapper">
  <div class="tcg-proxy"></div>
  <button class="tcg-display" type="button" aria-label="Expandir tarjeta">
    <img class="tcg-card" src="${this.getAttribute("src")}" alt="${this.getAttribute("alt") || ""}" loading="lazy">
    <div class="tcg-shine"></div>
    <div class="tcg-glare"></div>
  </button>
</div>
        `;

        this._shadowRoot = this.attachShadow({ mode: "closed" });
        this._shadowRoot.appendChild(template.content.cloneNode(true));

        this.handleMouseEnter = this.handleMouseEnter.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.handleDocumentKeydown = this.handleDocumentKeydown.bind(this);
    }

    connectedCallback() {
        this.card = this._shadowRoot.querySelector(".tcg-display");
        this.proxy = this._shadowRoot.querySelector(".tcg-proxy");
        this.wrapper = this._shadowRoot.querySelector(".tcg-wrapper");
        this.img = this._shadowRoot.querySelector(".tcg-card");

        this.addEventListener("mouseenter", this.handleMouseEnter);
        this.addEventListener("mouseleave", this.handleMouseLeave);
        this.addEventListener("mousemove", this.handleMouseMove);

        this.addEventListener("touchstart", this.handleTouchStart, { passive: true });
        this.addEventListener("touchmove", this.handleTouchMove, { passive: false });
        this.addEventListener("touchend", this.handleTouchEnd);
        this.addEventListener("touchcancel", this.handleTouchEnd);

        this.card.addEventListener("click", this.handleClick);
        window.addEventListener("resize", this.handleResize);

        this.initImage();
    }

    disconnectedCallback() {
        this.removeEventListener("mouseenter", this.handleMouseEnter);
        this.removeEventListener("mouseleave", this.handleMouseLeave);
        this.removeEventListener("mousemove", this.handleMouseMove);

        this.removeEventListener("touchstart", this.handleTouchStart);
        this.removeEventListener("touchmove", this.handleTouchMove);
        this.removeEventListener("touchend", this.handleTouchEnd);
        this.removeEventListener("touchcancel", this.handleTouchEnd);

        this.card?.removeEventListener("click", this.handleClick);
        window.removeEventListener("resize", this.handleResize);
        document.removeEventListener("keydown", this.handleDocumentKeydown);

        this.closeModal(true);
    }

    initImage() {
        const img = this.img;
        const fadeInDuration = 500;

        img.style.opacity = 0;
        img.style.transition = `opacity ${fadeInDuration}ms ease-in`;
        this.ready = false;

        const applyAspectRatio = () => {
            if (img.naturalWidth && img.naturalHeight) {
                this.style.setProperty(
                    "--card-aspect-ratio",
                    `${img.naturalWidth} / ${img.naturalHeight}`
                );
            }
        };

        const finalizeImage = () => {
            applyAspectRatio();
            this.wrapper.style.overflow = "";
            img.style.opacity = "";
            img.style.display = "block";
            this.ready = true;

            setTimeout(() => {
                img.style.transition = "";
            }, fadeInDuration);
        };

        if (img.complete && img.naturalWidth) {
            finalizeImage();
        } else {
            this.wrapper.style.overflow = "hidden";
            img.onload = finalizeImage;
        }
    }

    handleMouseEnter(e) {
        if (this.isTouching || this.expanded) return;
        this.startInteraction(this.card, this._shadowRoot, e.clientX, e.clientY, true);
    }

    handleMouseMove(e) {
        if (this.isTouching || this.expanded || !this.ready) return;
        this.updateTransform(this.card, this._shadowRoot, e.clientX, e.clientY);
    }

    handleMouseLeave() {
        if (this.isTouching || this.expanded) return;
        this.endInteraction(this.card, this._shadowRoot);
    }

    handleTouchStart(e) {
        if (this.expanded) return;
        this.isTouching = true;
        const touch = e.touches[0];
        this.startInteraction(this.card, this._shadowRoot, touch.clientX, touch.clientY, true);
    }

    handleTouchMove(e) {
        if (this.expanded) return;
        e.preventDefault();
        const touch = e.touches[0];
        this.updateTransform(this.card, this._shadowRoot, touch.clientX, touch.clientY);
    }

    handleTouchEnd() {
        if (this.expanded) return;
        this.endInteraction(this.card, this._shadowRoot);
    }

    handleClick(e) {
        e.stopPropagation();
        if (this.expanded) return;
        this.openModal();
    }

    handleResize() {
        if (this.expanded) {
            this.updateModalSize();
            this.resetModalTransform();
        }
    }

    startInteraction(cardEl, root, clientX, clientY, randomRotate = false) {
        if (!this.ready) return;

        const transitionTime = 220;
        cardEl.style.transition = `transform ${transitionTime}ms ease-out, opacity ${transitionTime}ms ease-out, filter ${transitionTime}ms ease-out`;

        const styleTarget = root === this._shadowRoot ? this.style : root.host.style;
        styleTarget.setProperty("--glare-opacity", "0.75");

        if (randomRotate) {
            const r = (Math.random() * 0.5 + 0.5) * (Math.random() < 0.5 ? -1 : 1);
            styleTarget.setProperty("--display-rz", `${r}deg`);
        }

        this.updateTransform(cardEl, root, clientX, clientY);

        setTimeout(() => {
            cardEl.style.transition = "";
        }, transitionTime);
    }

    updateTransform(cardEl, root, clientX, clientY) {
        const rect = cardEl.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const xPercent = (x / rect.width) * 100;
        const yPercent = (y / rect.height) * 100;
        const xFromCenter = x - rect.width / 2;
        const yFromCenter = y - rect.height / 2;
        const tiltX = -(yFromCenter / rect.height) * 10;
        const tiltY = (xFromCenter / rect.width) * 10;

        const styleTarget = root === this._shadowRoot ? this.style : root.host.style;
        const glareTarget = root === this._shadowRoot
            ? this._shadowRoot.querySelector(".tcg-glare")
            : root.host.querySelector(".tcg-modal-glare");

        styleTarget.setProperty("--pointer-x", `${xPercent}%`);
        styleTarget.setProperty("--pointer-y", `${yPercent}%`);
        styleTarget.setProperty("--display-rx", `${tiltX}deg`);
        styleTarget.setProperty("--display-ry", `${tiltY}deg`);
        styleTarget.setProperty("--glare-opacity", "0.75");

        if (glareTarget) {
            glareTarget.style.opacity = "0.75";
        }

        const rz = styleTarget.getPropertyValue("--display-rz") || "0deg";
        const isModal = cardEl === this.modalCardEl;

        cardEl.style.transform = isModal
            ? `translate(-50%, -50%) perspective(1200px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) rotateZ(${rz})`
            : `perspective(1200px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) rotateZ(${rz})`;
    }

    endInteraction(cardEl, root) {
        const transitionTime = 220;
        const styleTarget = root === this._shadowRoot ? this.style : root.host.style;
        const glareTarget = root === this._shadowRoot
            ? this._shadowRoot.querySelector(".tcg-glare")
            : root.host.querySelector(".tcg-modal-glare");

        cardEl.style.transition = `transform ${transitionTime}ms ease-out, opacity ${transitionTime}ms ease-out`;

        styleTarget.setProperty("--display-rx", "0deg");
        styleTarget.setProperty("--display-ry", "0deg");
        styleTarget.setProperty("--display-rz", "0deg");
        styleTarget.setProperty("--glare-opacity", "0");

        if (glareTarget) {
            glareTarget.style.opacity = "0";
        }

        const isModal = cardEl === this.modalCardEl;

        cardEl.style.transform = isModal
            ? `translate(-50%, -50%) perspective(1200px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)`
            : `perspective(1200px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)`;

        setTimeout(() => {
            cardEl.style.transition = "";
            this.isTouching = false;
        }, transitionTime);
    }

    createBackdrop() {
        const backdrop = document.createElement("div");
        backdrop.style.position = "fixed";
        backdrop.style.inset = "0";
        backdrop.style.background = "rgba(3, 6, 18, 0.62)";
        backdrop.style.backdropFilter = "blur(3px)";
        backdrop.style.opacity = "0";
        backdrop.style.pointerEvents = "none";
        backdrop.style.transition = "opacity 220ms ease";
        backdrop.style.zIndex = "9998";
        backdrop.addEventListener("click", () => this.closeModal());
        return backdrop;
    }

    createModalCard() {
        const modal = document.createElement("div");
        modal.style.position = "fixed";
        modal.style.left = "50%";
        modal.style.top = "50%";
        modal.style.transform = "translate(-50%, -50%) perspective(1200px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)";
        modal.style.transformOrigin = "center";
        modal.style.zIndex = "9999";
        modal.style.pointerEvents = "auto";
        modal.style.width = "320px";
        modal.style.height = "460px";
        modal.style.borderRadius = "24px";
        modal.style.transition = `width ${EXPAND_TRANSITION_TIME}ms ease, height ${EXPAND_TRANSITION_TIME}ms ease, transform 220ms ease`;
        modal.style.setProperty("--pointer-x", "50%");
        modal.style.setProperty("--pointer-y", "50%");
        modal.style.setProperty("--display-rz", "0deg");
        modal.style.setProperty("--display-rx", "0deg");
        modal.style.setProperty("--display-ry", "0deg");
        modal.style.setProperty("--glare-opacity", "0.75");

        modal.innerHTML = `
<div class="tcg-modal-inner" style="position:relative;width:100%;height:100%;border-radius:inherit;">
  <img src="${this.getAttribute("src")}" alt="${this.getAttribute("alt") || ""}" style="display:block;width:100%;height:100%;object-fit:contain;border-radius:inherit;filter:drop-shadow(0 12px 28px rgb(0 0 0 / 0.30));">
  <div class="tcg-modal-glare" style="
    position:absolute;
    inset:0;
    border-radius:inherit;
    pointer-events:none;
    mix-blend-mode:overlay;
    opacity:0.75;
    transition:opacity 500ms ease-out;
    background-image: radial-gradient(
      farthest-corner circle at var(--pointer-x) var(--pointer-y),
      hsla(0, 0%, 100%, 0.8) 10%,
      hsla(0, 0%, 100%, 0.65) 20%,
      hsla(0, 0%, 0%, 0.5) 90%
    );
  "></div>
</div>
        `;

        modal.addEventListener("mousemove", (e) => {
            this.updateTransform(modal, { host: modal }, e.clientX, e.clientY);
        });

        modal.addEventListener("mouseleave", () => {
            this.endInteraction(modal, { host: modal });
        });

        modal.addEventListener("touchstart", (e) => {
            const touch = e.touches[0];
            this.updateTransform(modal, { host: modal }, touch.clientX, touch.clientY);
        }, { passive: true });

        modal.addEventListener("touchmove", (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.updateTransform(modal, { host: modal }, touch.clientX, touch.clientY);
        }, { passive: false });

        modal.addEventListener("touchend", () => {
            this.endInteraction(modal, { host: modal });
        });

        modal.addEventListener("click", (e) => {
            e.stopPropagation();
        });

        return modal;
    }

    updateModalSize() {
        if (!this.modalCardEl) return;

        const naturalWidth = this.img?.naturalWidth || 320;
        const naturalHeight = this.img?.naturalHeight || 460;

        const maxWidth = window.innerWidth * 0.9;
        const maxHeight = window.innerHeight * 0.9;
        const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight, 1);

        const finalWidth = Math.round(naturalWidth * scale);
        const finalHeight = Math.round(naturalHeight * scale);

        this.modalCardEl.style.width = `${finalWidth}px`;
        this.modalCardEl.style.height = `${finalHeight}px`;
    }

    resetModalTransform() {
        if (!this.modalCardEl) return;
        this.modalCardEl.style.setProperty("--display-rx", "0deg");
        this.modalCardEl.style.setProperty("--display-ry", "0deg");
        this.modalCardEl.style.setProperty("--display-rz", "0deg");
        this.modalCardEl.style.transform = "translate(-50%, -50%) perspective(1200px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)";
    }

    openModal() {
        if (this.expanded) return;

        this.expanded = true;
        this.backdropEl = this.createBackdrop();
        this.modalCardEl = this.createModalCard();

        document.body.appendChild(this.backdropEl);
        document.body.appendChild(this.modalCardEl);

        requestAnimationFrame(() => {
            this.backdropEl.style.pointerEvents = "auto";
            this.backdropEl.style.opacity = "1";
            this.updateModalSize();
            this.resetModalTransform();
        });

        document.addEventListener("keydown", this.handleDocumentKeydown);
    }

    closeModal(silent = false) {
        this.expanded = false;

        if (this.backdropEl) {
            this.backdropEl.style.opacity = "0";
            this.backdropEl.style.pointerEvents = "none";
        }

        if (this.modalCardEl) {
            this.modalCardEl.style.pointerEvents = "none";
            this.modalCardEl.style.opacity = "0";
        }

        const cleanup = () => {
            if (this.backdropEl?.parentNode) this.backdropEl.parentNode.removeChild(this.backdropEl);
            if (this.modalCardEl?.parentNode) this.modalCardEl.parentNode.removeChild(this.modalCardEl);
            this.backdropEl = null;
            this.modalCardEl = null;
        };

        if (silent) {
            cleanup();
        } else {
            setTimeout(cleanup, 220);
        }

        document.removeEventListener("keydown", this.handleDocumentKeydown);
    }

    handleDocumentKeydown(e) {
        if (e.key === "Escape") {
            this.closeModal();
        }
    }
}

customElements.define("tcg-card", TCGCard);