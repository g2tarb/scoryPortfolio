/**
 * SCORY — cursor.js
 * Curseur custom (dot + ring magnetique) avec hover interactif.
 * Module autonome — importe uniquement gsap.
 */
import gsap from "gsap";

const THROTTLE_MS = 16;

/**
 * Initialise le curseur custom.
 * @param {{ neural: { setRotationInfluence(v: number): void }, reduced: boolean }} ctx
 */
export function initCursor(ctx) {
  const dot = document.getElementById("cursor-dot");
  const ring = document.getElementById("cursor-ring");
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  if (isTouch || !dot || !ring) return;

  let lastFrame = 0;

  document.addEventListener("mousemove", (e) => {
    gsap.set(dot, { x: e.clientX, y: e.clientY });

    const now = performance.now();
    if (now - lastFrame < THROTTLE_MS) return;
    lastFrame = now;

    gsap.to(ring, { x: e.clientX, y: e.clientY, duration: 0.28, ease: "power2.out" });

    if (!ctx.reduced && ctx.neural) {
      const influence = Math.hypot(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5) * 0.35;
      ctx.neural.setRotationInfluence(influence);
    }
  }, { passive: true });

  document.addEventListener("mouseover", (e) => {
    const hit = e.target.closest("a, button, .project-disc, .chat-pill, .nav-dot, .nav-arrow, input");
    ring.classList.toggle("is-hover", !!hit);
  });
}

/**
 * Effet magnetique sur les fleches du carrousel.
 * @param {HTMLElement[]} arrows
 */
export function initMagneticArrows(arrows) {
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  if (isTouch) return;

  arrows.forEach((arrow) => {
    const svg = arrow.querySelector("svg");
    if (!svg) return;

    arrow.addEventListener("mouseenter", () => {
      gsap.to(svg, { scale: 1.15, duration: 0.25, ease: "power2.out" });
    });
    arrow.addEventListener("mouseleave", () => {
      gsap.to(svg, { scale: 1, x: 0, y: 0, duration: 0.35, ease: "elastic.out(1, 0.5)" });
    });
    arrow.addEventListener("mousemove", (e) => {
      const rect = arrow.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) * 0.25;
      const y = (e.clientY - rect.top - rect.height / 2) * 0.25;
      gsap.to(svg, { x, y, duration: 0.2, ease: "power2.out" });
    });
  });
}
