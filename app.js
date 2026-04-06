/**
 * Application principale SCORY : carrousel type « vinyles », fond WebGL neural,
 * et loupe « expert » (long press) avec feedback sur le shader Three.js.
 */
import gsap from "gsap";
import { FlaynnNeuralBackground } from "./three-neural.js";

/**
 * Courbe d’animation pour l’arrivée du disque suivant — calibrée comme
 * --ease-spring-heavy dans defaut.css (sensation ressort / stabilisation).
 */
const EASE_SPRING_HEAVY = "back.out(1.32)";

/** Textes du cartel d’exposition (titres + descriptions) — alignés sur les articles HTML */
const PROJECTS = [
  {
    title: "Nébula",
    desc: "Installation lumineuse et interface tactile — une orbite de particules réagit au geste.",
  },
  {
    title: "Atlas",
    desc: "Cartographies vivantes et narration data — le récit se déploie au scroll.",
  },
  {
    title: "Velum",
    desc: "Identité shader-driven — matière, brume et typographie en tension.",
  },
  {
    title: "Agora",
    desc: "Plateforme full-stack — API, auth et expérience utilisateur monolithique.",
  },
];

/** Faux code affiché dans la loupe (chaîne injectée dans le <pre> de l’overlay) */
const CODE_LOUPE = `// SCORY — app.js (extrait — envers du décor)
import gsap from "gsap";
import { FlaynnNeuralBackground } from "./three-neural.js";

const EASE_SPRING_HEAVY = "back.out(1.32)"; // miroir de --ease-spring-heavy

export function mountCarousel(neural, ctx) {
  const tl = gsap.timeline({
    onUpdate: () => neural.setTransitionProgress(tl.progress()),
    onComplete: () => neural.setTransitionProgress(0),
  });
  tl.to(current, { rotateX: -15, y: -40, opacity: 0, ease: "power2.in" });
  tl.to(track, { x: targetX, duration: 0.55, ease: "power3.inOut" }, 0);
  tl.fromTo(
    next,
    { rotateX: 45, y: 100, opacity: 0 },
    { rotateX: 0, y: 0, opacity: 1, ease: EASE_SPRING_HEAVY },
    0.12
  );
  return tl;
}

// La loupe expert : long-press → uLoupeProgress → zoom caméra + code
function onExpertLoupe(neural, progress) {
  neural.setLoupeProgress(progress);
}
`;

/** Détecte la préférence système « moins d’animations » (accessibilité) */
function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Lit l’espace entre les flex items (#project-track) pour calculer la position du rail */
function getGapPx(el) {
  const g = getComputedStyle(el).gap || getComputedStyle(el).columnGap;
  return parseFloat(g) || 0;
}

/**
 * Calcule la translation horizontale (GSAP `x`) du rail pour centrer le disque `index`
 * dans la zone visible du carrousel.
 */
function getTrackXForIndex(carousel, track, discs, index) {
  const gap = getGapPx(track);
  let left = 0;
  for (let i = 0; i < index; i++) {
    left += discs[i].offsetWidth + gap;
  }
  return carousel.clientWidth / 2 - left - discs[index].offsetWidth / 2;
}

/** Point d’entrée : récupère le DOM, instancie le fond neural, branche les gestes */
function main() {
  const stage = document.getElementById("museum-stage");
  const neuralHost = document.getElementById("neural-host");
  const carousel = document.getElementById("project-carousel");
  const track = document.getElementById("project-track");
  const labelTitle = document.getElementById("label-title");
  const labelDesc = document.getElementById("label-desc");
  const loupe = document.getElementById("expert-loupe");
  const loupeCode = loupe.querySelector("#expert-code-scroll code");

  if (!stage || !neuralHost || !carousel || !track) return;

  loupeCode.textContent = CODE_LOUPE;

  const reduced = prefersReducedMotion();
  // Fond Three.js : timeScale réduit si l’utilisateur a demandé moins de mouvement
  const neural = new FlaynnNeuralBackground(neuralHost, {
    timeScale: reduced ? 0.22 : 1,
  });

  let activeIndex = 0; // index du projet actuellement « sélectionné »
  let animating = false; // évite les transitions qui se chevauchent
  let dragPointerId = null; // pointerId pour suivre le bon doigt / souris
  let dragStartX = 0; // origine du drag (décision swipe)
  let dragLastX = 0;
  let dragLastT = 0; // horodatage pour estimer la vélocité
  let velocity = 0; // utilisée pour le feedback organique sur le shader
  let longPressTimer = null; // timer du maintien pour la loupe expert
  let longPressArmed = true; // annulé si l’utilisateur bouge trop (ce n’est plus un long press)
  let loupeActive = false; // overlay code + zoom caméra
  let loupeTween = null; // tween GSAP courant sur uLoupeProgress
  let orbitMode = false; // true = projets disposés en cercle
  let dragStartY = 0;
  let pointerDownAt = 0;

  /** Liste à jour des éléments disque dans le rail */
  const discs = () => [...track.querySelectorAll(".project-disc")];

  /** Rayon du cercle (px) selon la taille du carrousel */
  function getOrbitRadius() {
    const w = carousel.clientWidth;
    const h = carousel.clientHeight;
    return Math.min(w, h) * 0.36;
  }

  /** Indique en HTML si la vue circulaire est active (style / tests) */
  function setOrbitAria(on) {
    carousel.setAttribute("data-orbit", on ? "true" : "false");
  }

  /**
   * Place chaque disque sur le cercle : le projet actif en bas (devant), les autres autour.
   * @param {boolean} animate — false = recalcul immédiat (resize, reduced motion)
   */
  function layoutOrbitDiscs(animate) {
    const d = discs();
    const n = d.length;
    if (n === 0) return;
    const r = getOrbitRadius();
    const dur = animate && !reduced ? 0.62 : 0;
    d.forEach((disc, i) => {
      const theta = Math.PI / 2 + (i - activeIndex) * ((2 * Math.PI) / n);
      const x = r * Math.cos(theta);
      const y = r * Math.sin(theta);
      const scale = i === activeIndex ? 1.1 : 0.88;
      if (dur > 0) {
        gsap.to(disc, {
          xPercent: -50,
          yPercent: -50,
          x,
          y,
          scale,
          duration: dur,
          ease: EASE_SPRING_HEAVY,
        });
      } else {
        gsap.set(disc, { xPercent: -50, yPercent: -50, x, y, scale });
      }
    });
  }

  /** Passe en vue circulaire : le disque cliqué devient le projet « devant » (bas du cercle) */
  function enterOrbit(idx) {
    if (animating || orbitMode) return;
    animating = true;
    activeIndex = idx;
    setActiveClasses(activeIndex);
    setLabel(activeIndex);
    gsap.set(track, { x: 0 });
    orbitMode = true;
    carousel.classList.add("carousel--orbit");
    track.classList.add("is-orbit");
    setOrbitAria(true);

    const d = discs();
    d.forEach((disc) => {
      gsap.set(disc, {
        xPercent: -50,
        yPercent: -50,
        x: 0,
        y: 0,
        scale: 0.48,
        rotateX: 0,
        transformOrigin: "50% 50%",
      });
    });

    const n = d.length;
    const r = getOrbitRadius();
    const tl = gsap.timeline({
      onUpdate: () => neural.setTransitionProgress(tl.progress()),
      onComplete: () => {
        animating = false;
        neural.setTransitionProgress(0);
      },
    });
    d.forEach((disc, i) => {
      const theta = Math.PI / 2 + (i - activeIndex) * ((2 * Math.PI) / n);
      const x = r * Math.cos(theta);
      const y = r * Math.sin(theta);
      const scale = i === activeIndex ? 1.1 : 0.88;
      tl.to(
        disc,
        {
          xPercent: -50,
          yPercent: -50,
          x,
          y,
          scale,
          duration: reduced ? 0 : 0.78,
          ease: EASE_SPRING_HEAVY,
        },
        0
      );
    });
  }

  /** Retour au rail horizontal */
  function exitOrbit() {
    if (!orbitMode || animating) return;
    animating = true;
    const d = discs();
    const tl = gsap.timeline({
      onComplete: () => {
        orbitMode = false;
        carousel.classList.remove("carousel--orbit");
        track.classList.remove("is-orbit");
        setOrbitAria(false);
        d.forEach((disc) => gsap.set(disc, { clearProps: "all" }));
        positionTrack(activeIndex, true);
        animating = false;
        neural.setTransitionProgress(0);
      },
    });
    d.forEach((disc) => {
      tl.to(
        disc,
        {
          xPercent: -50,
          yPercent: -50,
          x: 0,
          y: 0,
          scale: 0.5,
          duration: reduced ? 0 : 0.42,
          ease: "power2.in",
        },
        0
      );
    });
  }

  /** Fait tourner la sélection sur le cercle (swipe ou flèches) */
  function orbitStep(delta) {
    const n = discs().length;
    if (n === 0 || !orbitMode || animating) return;
    activeIndex = (activeIndex + delta + n) % n;
    setActiveClasses(activeIndex);
    setLabel(activeIndex);
    layoutOrbitDiscs(!reduced);
  }

  /** Met à jour le cartel (titre + texte) selon l’index projet */
  function setLabel(i) {
    const p = PROJECTS[i];
    if (!p) return;
    labelTitle.textContent = p.title;
    labelDesc.textContent = p.desc;
  }

  /** Marque visuellement le disque actif et l’état pour les lecteurs d’écran */
  function setActiveClasses(i) {
    discs().forEach((d, idx) => {
      d.classList.toggle("is-active", idx === i);
      d.setAttribute("aria-current", idx === i ? "true" : "false");
    });
  }

  /**
   * Après un geste, amortit la vélocité et pousse `uRotationInfluence` sur le shader
   * jusqu’à retomber à zéro (effet « spin » résiduel).
   */
  function applyNeuralSpin() {
    const spin = Math.min(1.8, Math.abs(velocity) / 420);
    neural.setRotationInfluence(spin);
    velocity *= 0.94;
    if (Math.abs(velocity) > 0.01) {
      requestAnimationFrame(applyNeuralSpin);
    } else {
      neural.setRotationInfluence(0);
    }
  }

  /** Centre le rail sur un index (avec ou sans animation douce) */
  function positionTrack(index, useInstant) {
    const d = discs();
    const x = getTrackXForIndex(carousel, track, d, index);
    if (reduced || useInstant) {
      gsap.set(track, { x });
    } else {
      gsap.to(track, {
        x,
        duration: 0.45,
        ease: "power3.out",
      });
    }
  }

  /**
   * Passe au projet `nextIndex` : animation GSAP du disque courant (sortie),
   * translation du rail, entrée du suivant avec ressort — `onUpdate` alimente
   * `uTransitionProgress` pour le fond neural.
   */
  function goTo(nextIndex) {
    if (orbitMode) return;
    const d = discs();
    const n = d.length;
    if (n === 0 || animating || nextIndex === activeIndex) return;
    if (nextIndex < 0 || nextIndex >= n) return;

    animating = true;
    const currentDisc = d[activeIndex];
    const nextDisc = d[nextIndex];
    const targetX = getTrackXForIndex(carousel, track, d, nextIndex);

    // Mode réduit : pas d’animation, saut direct + MAJ texte / classes
    if (reduced) {
      activeIndex = nextIndex;
      gsap.set([currentDisc, nextDisc], { clearProps: "transform,opacity" });
      positionTrack(activeIndex, true);
      setActiveClasses(activeIndex);
      setLabel(activeIndex);
      animating = false;
      return;
    }

    // État initial : suivant « en bas », penché ; courant prêt à pivoter vers l’arrière
    gsap.set(nextDisc, { rotateX: 45, y: 100, opacity: 0, transformOrigin: "50% 50%" });
    gsap.set(currentDisc, { transformOrigin: "50% 50%" });

    const tl = gsap.timeline({
      defaults: { overwrite: "auto" },
      // progresse 0→1 pendant toute la timeline → morph du shader de fond
      onUpdate: () => neural.setTransitionProgress(tl.progress()),
      onComplete: () => {
        activeIndex = nextIndex;
        gsap.set(currentDisc, { clearProps: "all" });
        gsap.set(nextDisc, { clearProps: "all" });
        setActiveClasses(activeIndex);
        setLabel(activeIndex);
        neural.setTransitionProgress(0);
        animating = false;
      },
    });

    // Disque actuel : inclinaison -15° sur X, monte et disparaît
    tl.to(
      currentDisc,
      {
        rotateX: -15,
        y: -40,
        opacity: 0,
        duration: 0.46,
        ease: "power2.in",
      },
      0
    );

    // Rail : glisse pour amener le suivant au centre
    tl.to(
      track,
      {
        x: targetX,
        duration: 0.56,
        ease: "power3.inOut",
      },
      0
    );

    // Nouveau disque : arrive du bas avec rotation, se stabilise avec ressort
    tl.to(
      nextDisc,
      {
        rotateX: 0,
        y: 0,
        opacity: 1,
        duration: 0.74,
        ease: EASE_SPRING_HEAVY,
      },
      0.12
    );
  }

  /**
   * Ouvre la loupe : overlay visible, tween brutal vers uLoupeProgress = 1 (zoom shader + caméra).
   * Écoute `pointerup`/`pointercancel` sur `window` car l’overlay recouvre le carrousel.
   */
  function openLoupe() {
    if (loupeActive || reduced) return;
    loupeActive = true;
    loupe.classList.add("is-visible");
    loupe.setAttribute("aria-hidden", "false");

    if (loupeTween) loupeTween.kill();
    const o = { p: neural.getLoupeProgress() };
    loupeTween = gsap.to(o, {
      p: 1,
      duration: 0.38,
      ease: "power4.in",
      onUpdate: () => neural.setLoupeProgress(o.p),
    });

    const finishLoupe = () => {
      window.removeEventListener("pointerup", finishLoupe);
      window.removeEventListener("pointercancel", finishLoupe);
      if (!loupeActive) return;
      try {
        if (dragPointerId != null) {
          carousel.releasePointerCapture(dragPointerId);
        }
      } catch {
        /* ignore */
      }
      dragPointerId = null;
      closeLoupe();
      const activeDisc = discs()[activeIndex];
      if (activeDisc) gsap.set(activeDisc, { clearProps: "rotateX" });
      requestAnimationFrame(applyNeuralSpin);
    };
    window.addEventListener("pointerup", finishLoupe);
    window.addEventListener("pointercancel", finishLoupe);
  }

  /** Ferme la loupe : tween fluide avec rebond (back.out) sur le zoom */
  function closeLoupe() {
    if (!loupeActive) return;
    loupeActive = false;
    loupe.classList.remove("is-visible");
    loupe.setAttribute("aria-hidden", "true");

    if (loupeTween) loupeTween.kill();
    const o = { p: neural.getLoupeProgress() };
    loupeTween = gsap.to(o, {
      p: 0,
      duration: 0.85,
      ease: "back.out(1.45)",
      onUpdate: () => neural.setLoupeProgress(o.p),
      onComplete: () => neural.setLoupeProgress(0),
    });
  }

  /* --- Pointer / swipe : drag horizontal, swipe pour changer de disque, long press = loupe --- */

  carousel.addEventListener("pointerdown", (e) => {
    if (animating || loupeActive) return;
    dragPointerId = e.pointerId;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    pointerDownAt = performance.now();
    dragLastX = e.clientX;
    dragLastT = performance.now();
    velocity = 0;
    // Garantit les événements pointer sur ce nœud pendant le drag
    carousel.setPointerCapture(e.pointerId);

    longPressArmed = true;
    const target = e.target.closest(".project-disc");
    // Long press uniquement sur le disque déjà actif → ouvre la loupe après 420 ms
    if (target && target.classList.contains("is-active")) {
      longPressTimer = window.setTimeout(() => {
        if (longPressArmed) openLoupe();
      }, 420);
    }
  });

  carousel.addEventListener("pointermove", (e) => {
    if (e.pointerId !== dragPointerId) return;
    const dx = e.clientX - dragStartX;
    // Mouvement horizontal : ce n’est plus un long press pur
    if (Math.abs(dx) > 12) {
      longPressArmed = false;
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }

    const now = performance.now();
    const dt = Math.max(1, now - dragLastT);
    const inst = (e.clientX - dragLastX) / dt;
    velocity = velocity * 0.65 + inst * 350;
    dragLastX = e.clientX;
    dragLastT = now;

    // Inclinaison live du disque actif (vue ligne uniquement) + feedback neural
    if (!reduced && !loupeActive && !orbitMode) {
      const active = discs()[activeIndex];
      if (active) {
        const tilt = Math.max(-8, Math.min(8, dx * 0.04));
        gsap.set(active, { rotateX: tilt, transformOrigin: "50% 50%" });
      }
      neural.setRotationInfluence(Math.min(1.6, Math.abs(velocity) / 380));
    }
  });

  carousel.addEventListener("pointerup", (e) => {
    if (e.pointerId !== dragPointerId) return;
    carousel.releasePointerCapture(e.pointerId);
    dragPointerId = null;

    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }

    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    const tapDuration = performance.now() - pointerDownAt;
    const clickedDisc = e.target.closest(".project-disc");

    const isTap =
      Math.abs(dx) <= 20 &&
      Math.abs(dy) <= 20 &&
      tapDuration < 650 &&
      clickedDisc &&
      !loupeActive;

    if (isTap && !animating) {
      const idx = parseInt(clickedDisc.dataset.index, 10);
      if (Number.isFinite(idx)) {
        if (!orbitMode) {
          enterOrbit(idx);
        } else if (idx === activeIndex) {
          exitOrbit();
        } else {
          activeIndex = idx;
          setActiveClasses(activeIndex);
          setLabel(activeIndex);
          layoutOrbitDiscs(!reduced);
        }
      }
      const activeDisc = discs()[activeIndex];
      if (activeDisc && !reduced && !orbitMode) {
        gsap.to(activeDisc, { rotateX: 0, duration: 0.35, ease: EASE_SPRING_HEAVY });
      }
      requestAnimationFrame(applyNeuralSpin);
      return;
    }

    const active = discs()[activeIndex];
    if (active && !reduced) {
      gsap.to(active, {
        rotateX: 0,
        duration: 0.35,
        ease: EASE_SPRING_HEAVY,
      });
    }

    requestAnimationFrame(applyNeuralSpin);

    if (Math.abs(dx) > 56 && !animating) {
      if (orbitMode) {
        if (dx < 0) orbitStep(1);
        else orbitStep(-1);
      } else {
        if (dx < 0) goTo(activeIndex + 1);
        else goTo(activeIndex - 1);
      }
    }
  });

  carousel.addEventListener("pointercancel", (e) => {
    if (e.pointerId !== dragPointerId) return;
    dragPointerId = null;
    if (longPressTimer) clearTimeout(longPressTimer);
    longPressTimer = null;
    const active = discs()[activeIndex];
    if (active && !reduced) gsap.to(active, { rotateX: 0, duration: 0.3, ease: EASE_SPRING_HEAVY });
  });

  carousel.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && orbitMode) {
      e.preventDefault();
      exitOrbit();
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      if (orbitMode) orbitStep(1);
      else goTo(activeIndex + 1);
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (orbitMode) orbitStep(-1);
      else goTo(activeIndex - 1);
    }
  });

  window.addEventListener(
    "resize",
    () => {
      neural.resize();
      if (orbitMode) layoutOrbitDiscs(false);
      else positionTrack(activeIndex, true);
    },
    { passive: true }
  );

  setActiveClasses(0);
  setLabel(0);
  positionTrack(0, true);
  setOrbitAria(false);

  if (reduced) {
    neural.setRotationInfluence(0);
    neural.setTransitionProgress(0);
  }
}

main();
