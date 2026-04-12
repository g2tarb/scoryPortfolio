/**
 * SCORY — app.js
 * Carrousel disques, transitions particules, chatbot devis, booking.
 * Three.js charge en differe pour ne pas bloquer le main thread.
 */
/**
 * SCORY — app.js
 * Orchestrateur principal. Les modules sont scindés par responsabilité :
 *   - cursor.js     → curseur custom + effet magnétique flèches
 *   - particles.js  → transitions particules entre disques
 *   - chatbot.js    → chatbot devis interactif
 *   - booking.js    → calendrier de réservation
 *   - three-*.js    → rendus WebGL (chargés en différé)
 *   - aurora.js / universe.js / nebula-flaynn.js → fonds projet
 *   - i18n.js       → internationalisation FR/EN
 *   - data.js       → données projets, thèmes, flux chatbot
 */
import gsap from "gsap";
import Lenis from "lenis";
import { PROJECTS as PROJECTS_ALL, THEMES, CHAT_FLOW as CHAT_FLOW_ALL } from "./data.js";
import { getLang, setLang, t } from "./i18n.js";
import { initCursor, initMagneticArrows } from "./cursor.js";
import { initAudio } from "./audio.js";

/** Getters bilingues */
function PROJECTS() { return PROJECTS_ALL[getLang()] || PROJECTS_ALL.fr; }
function CHAT_FLOW() { return CHAT_FLOW_ALL[getLang()] || CHAT_FLOW_ALL.fr; }

/* ---------- Constantes ---------- */
const EASE_SPRING_HEAVY = "back.out(1.32)";
const LOADER_DELAY_MS = 1500;
const CLOSE_OUTSIDE_DELAY_MS = 600;
const DISC_SPIN_SPEED = 0.06;
const RESIZE_DEBOUNCE_MS = 100;
const SWIPE_VELOCITY_MIN = 0.3;
const SWIPE_DISTANCE_FAST = 40;
const SWIPE_DISTANCE_SLOW = 60;
const SCORY_INDEX = 0;
const CONTACT_EMAIL = "gdbyana@gmail.com";


/** @param {string} email @returns {boolean} */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** @param {string} hex - couleur "#RRGGBB" @param {number} a - alpha 0-1 @returns {string} rgba() */
function hexToRgba(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}


const GLITCH_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!?/<>{}[]~^";

/**
 * Typewriter + glitch : chaque caractere cycle a travers des glyphs aleatoires
 * colores avec la couleur du theme avant de se fixer.
 * @param {HTMLElement} el
 * @param {string} text
 * @param {{ charDelay?: number, glitchRounds?: number, glitchSpeed?: number, color?: string }} opts
 * @returns {{ cancel: () => void, done: Promise<void> }}
 */
function glitchType(el, text, opts = {}) {
  const charDelay = opts.charDelay ?? 18;
  const glitchRounds = opts.glitchRounds ?? 3;
  const glitchSpeed = opts.glitchSpeed ?? 30;
  const color = opts.color ?? "var(--accent-gold)";
  let cancelled = false;
  el.innerHTML = "";
  const spans = [];
  for (let i = 0; i < text.length; i++) {
    const s = document.createElement("span");
    s.style.opacity = "0";
    spans.push(s);
    el.appendChild(s);
  }
  const done = new Promise((resolve) => {
    let i = 0;
    function nextChar() {
      if (cancelled || i >= text.length) { resolve(); return; }
      const idx = i++;
      const span = spans[idx];
      const final = text[idx];
      if (final === " ") {
        span.textContent = "\u00A0";
        span.style.opacity = "1";
        setTimeout(nextChar, charDelay * 0.3);
        return;
      }
      span.style.opacity = "1";
      span.style.color = color;
      span.classList.add("glitch-char");
      let round = 0;
      const tick = setInterval(() => {
        if (cancelled) { clearInterval(tick); resolve(); return; }
        if (round < glitchRounds) {
          span.textContent = GLITCH_CHARS[Math.random() * GLITCH_CHARS.length | 0];
          round++;
        } else {
          clearInterval(tick);
          span.textContent = final;
          span.style.color = "";
          span.classList.remove("glitch-char");
        }
      }, glitchSpeed);
      setTimeout(nextChar, charDelay);
    }
    nextChar();
  });
  return { cancel: () => { cancelled = true; }, done };
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** @param {HTMLElement} container @returns {(()=>void)|null} cleanup function */
function trapFocus(container) {
  const focusable = container.querySelectorAll('button, a, input, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusable.length === 0) return null;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const handler = (e) => {
    if (e.key !== "Tab") return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  container.addEventListener("keydown", handler);
  first.focus();
  return () => container.removeEventListener("keydown", handler);
}

/** Yield au browser pour ne pas bloquer le main thread */
function yieldToBrowser() {
  return new Promise((r) => setTimeout(r, 0));
}

/** Scroll fiable vers un element — fonctionne sur Safari iOS + Lenis */
function scrollToElement(el) {
  if (!el) return;
  const targetY = el.getBoundingClientRect().top + window.scrollY - innerHeight * 0.15;
  try { window.scrollTo({ top: targetY, behavior: "smooth" }); } catch { window.scrollTo(0, targetY); }
  // Double fallback Safari
  setTimeout(() => {
    const rect = el.getBoundingClientRect();
    if (rect.top > innerHeight * 0.5) {
      try { el.scrollIntoView({ behavior: "smooth", block: "start" }); } catch { el.scrollIntoView(true); }
    }
  }, 600);
}

/* ---------- Mode eco toggle ---------- */
const PERF_KEY = "scory_perf_mode";

function applyEcoMode(eco) {
  document.body.classList.toggle("eco-mode", eco);
}

function showEcoMessage(text, color) {
  const msg = document.getElementById("eco-message");
  if (!msg) return;
  msg.innerHTML = `<span class="eco-message__dot" style="background:${color};box-shadow:0 0 6px ${color}"></span>${text}`;
  msg.classList.add("is-visible");
  setTimeout(() => msg.classList.remove("is-visible"), 2500);
}

function toggleEcoMode() {
  const isEco = document.body.classList.contains("eco-mode");
  const newMode = isEco ? "full" : "eco";
  localStorage.setItem(PERF_KEY, newMode);

  showEcoMessage(
    isEco ? "Full Performance" : "Mode Eco",
    isEco ? "#c9a962" : "#10b981"
  );

  applyEcoMode(!isEco);
  setTimeout(() => window.location.reload(), 1500);
}

// Bind l'interrupteur eco (meme element desktop + mobile)
const _ecoBtn = document.getElementById("eco-toggle");
if (_ecoBtn) {
  _ecoBtn.addEventListener("click", toggleEcoMode);
  _ecoBtn.addEventListener("touchend", (e) => { e.preventDefault(); toggleEcoMode(); });
}

function initEcoMode() {
  const saved = localStorage.getItem(PERF_KEY);
  if (saved === "eco") applyEcoMode(true);
}

async function main() {
  const stage = document.getElementById("museum-stage");
  const neuralHost = document.getElementById("neural-host");
  const carousel = document.getElementById("project-carousel");
  const track = document.getElementById("project-track");
  const labelNum = document.getElementById("label-num");
  const labelTitle = document.getElementById("label-title");
  const labelDesc = document.getElementById("label-desc");
  const labelStack = document.getElementById("label-stack");
  const detailPanel = document.getElementById("detail-panel");
  const detailTitle = document.getElementById("detail-title");
  const detailText = document.getElementById("detail-text");
  const arrowLeft = document.getElementById("arrow-left");
  const arrowRight = document.getElementById("arrow-right");
  const dotsContainer = document.getElementById("nav-dots");
  const particleCanvas = document.getElementById("particle-canvas");

  if (!stage || !neuralHost || !carousel || !track) return;

  const reduced = prefersReducedMotion();
  const ecoMode = document.body.classList.contains("eco-mode");
  const skipNeural = ecoMode;
  const loader = document.getElementById("loader");
  const projectBgHost = document.getElementById("project-bg-host");

  /* ===== Neural supprime — stub permanent ===== */
  const neural = { resize() {}, setTransitionProgress() {}, setRotationInfluence() {} };
  if (neuralHost) neuralHost.style.display = "none";
  const threeReady = Promise.resolve();

  /* ---------- Fonds projet (initialisés au premier usage) ---------- */
  const projectBgs = {};
  let activeProjectBg = null;

  async function getProjectBg(index) {
    if (projectBgs[index]) return projectBgs[index];
    if (!projectBgHost) return null;
    try {
      switch (index) {
        case 0: {
          const video = document.createElement("video");
          video.src = "./scoryModel.mp4";
          video.autoplay = true;
          video.loop = true;
          video.muted = true;
          video.playsInline = true;
          video.setAttribute("webkit-playsinline", "");
          video.setAttribute("preload", "metadata");
          video.className = "project-bg-canvas scory-bg-video";
          video.style.display = "none";
          projectBgHost.appendChild(video);
          projectBgs[0] = {
            canvas: video,
            orb: null,
            start() {
              video.play().catch(() => {
                const playOnce = () => { video.play().catch(() => {}); document.removeEventListener("touchstart", playOnce); };
                document.addEventListener("touchstart", playOnce, { once: true });
              });
            },
            stop() { video.pause(); }
          };
          break;
        }
        case 1: { const { UniverseBackground } = await import("./universe.js"); projectBgs[1] = new UniverseBackground(projectBgHost); break; }
        case 2: { const { AuroraBorealis } = await import("./aurora.js"); projectBgs[2] = new AuroraBorealis(projectBgHost); break; }
        case 3: { const { FlaynnNebula } = await import("./nebula-flaynn.js"); projectBgs[3] = new FlaynnNebula(projectBgHost); break; }
        case 4: {
          const video = document.createElement("video");
          video.src = "./fondAnime/diable.mp4";
          video.autoplay = true;
          video.loop = true;
          video.muted = true;
          video.playsInline = true;
          video.setAttribute("webkit-playsinline", "");
          video.setAttribute("preload", "metadata");
          video.className = "project-bg-canvas animus-bg-video";
          video.style.display = "none";
          projectBgHost.appendChild(video);
          projectBgs[4] = {
            canvas: video,
            orb: null,
            start() {
              video.play().catch(() => {
                // iOS fallback: play on first user interaction
                const playOnce = () => { video.play().catch(() => {}); document.removeEventListener("touchstart", playOnce); };
                document.addEventListener("touchstart", playOnce, { once: true });
              });
            },
            stop() { video.pause(); }
          };
          break;
        }
        default: return null;
      }
    } catch { return null; }
    return projectBgs[index];
  }

  async function showProjectBg(index) {
    Object.values(projectBgs).forEach((bg) => bg.stop());
    if (projectBgHost) {
      projectBgHost.querySelectorAll(".project-bg-canvas, .flaynn-orbit").forEach((c) => { c.style.display = "none"; });
    }
    if (!projectBgHost) {
      activeProjectBg = null;
      return;
    }

    const bg = await getProjectBg(index);
    if (!bg) return;
    bg.canvas.style.display = "block";
    if (bg.orb) bg.orb.style.display = "block";
    bg.start();
    activeProjectBg = bg;
    gsap.to(projectBgHost, { opacity: 1, duration: 2, ease: "power2.inOut" });
  }

  function hideProjectBg() {
    if (!projectBgHost) return;
    gsap.to(projectBgHost, { opacity: 0, duration: 0.5 });
    Object.values(projectBgs).forEach((bg) => bg.stop());
    activeProjectBg = null;
  }

  // PHASE 3 : Montrer le site apres le loader (n'attend PAS Three.js)
  setTimeout(() => {
    if (loader) loader.classList.add("is-hidden");
    if (!reduced) {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".floating-brand", { opacity: 0, y: -20, duration: 0.7 }, 0.1)
        .from(".project-carousel", { opacity: 0, y: 40, scale: 0.97, duration: 0.9 }, 0.25)
        .from(".nav-arrow", { opacity: 0, scale: 0.5, duration: 0.5, stagger: 0.1 }, 0.5)
        .from(".museum-label", { opacity: 0, x: 30, duration: 0.7 }, 0.4)
        .from(".scroll-hint", { opacity: 0, y: 15, duration: 0.5 }, 0.7);
    }
  }, LOADER_DELAY_MS);

  // ===== LENIS SMOOTH SCROLL =====
  if (!ecoMode) {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
    });
    function lenisRaf(time) {
      lenis.raf(time);
      requestAnimationFrame(lenisRaf);
    }
    requestAnimationFrame(lenisRaf);
    // Sync GSAP ScrollTrigger si present
    lenis.on("scroll", () => { if (window.ScrollTrigger) window.ScrollTrigger.update(); });
  }

  // Three.js lance le fond quand il est pret
  threeReady.then(() => showProjectBg(activeIndex));

  // Appliquer la langue sauvegardee au demarrage
  setLang(getLang());

  /* ---------- Toggle langue FR/EN ---------- */
  const langToggle = document.getElementById("lang-toggle");
  if (langToggle) {
    langToggle.textContent = getLang().toUpperCase();
    langToggle.addEventListener("click", () => {
      const newLang = getLang() === "fr" ? "en" : "fr";
      setLang(newLang);
      langToggle.textContent = newLang.toUpperCase();
      // Rafraichir le cartel
      setLabel(activeIndex);
      // Rafraichir les titres/meta sur les disques
      const projects = PROJECTS();
      _discsCache.forEach((disc, i) => {
        const p = projects[i];
        if (!p) return;
        const titleEl = disc.querySelector(".disc-title");
        const metaEl = disc.querySelector(".disc-meta");
        if (titleEl) titleEl.textContent = p.title;
        if (metaEl) metaEl.textContent = p.desc.split("—")[0].trim().substring(0, 30);
      });
      // Rafraichir les dots
      buildDots();
      // Relancer le chatbot dans la nouvelle langue
      if (chatStateRef.restart) chatStateRef.restart();
      // Titre de page
      const project = projects[activeIndex];
      document.title = activeIndex === SCORY_INDEX
        ? (newLang === "fr" ? "SCORY — Musee Digital" : "SCORY — Digital Museum")
        : `${project?.title || ""} — SCORY`;
    });
  }

  gsap.set(neuralHost, { opacity: 1 });

  /* ---------- Particules (lazy) ---------- */
  let particles = { transition() { return Promise.resolve(); }, resize() {}, setColors() {} };
  import("./particles.js").then(({ ParticleTransition }) => {
    particles = new ParticleTransition(particleCanvas);
    const t = THEMES[activeIndex];
    if (t) particles.setColors(t.particleColors);
  });

  /* ---------- Thème dynamique ---------- */
  function applyTheme(index) {
    const t = THEMES[index];
    if (!t) return;
    const s = document.documentElement.style;
    s.setProperty("--accent-gold", t.gold);
    s.setProperty("--accent-amber", t.amber);
    s.setProperty("--accent-ice", t.ice);
    s.setProperty("--accent-magenta", t.magenta);
    s.setProperty("--theme-glow", t.glow);
    s.setProperty("--theme-glow-strong", t.glowStrong);
    s.setProperty("--theme-glow-disc", t.glowDisc);
    s.setProperty("--font-display", t.fontDisplay);
    s.setProperty("--font-sans", t.fontSans);
    neuralHost.style.filter = t.neuralFilter;
    // Couleurs chatbot (calculées depuis les hex)
    s.setProperty("--theme-tint-a", hexToRgba(t.magenta, 0.08));
    s.setProperty("--theme-tint-b", hexToRgba(t.magenta, 0.18));
    s.setProperty("--theme-tint-c", hexToRgba(t.magenta, 0.3));
    s.setProperty("--theme-tint-d", hexToRgba(t.magenta, 0.55));
    s.setProperty("--theme-warm-a", hexToRgba(t.amber, 0.1));
    s.setProperty("--theme-warm-b", hexToRgba(t.amber, 0.2));
    s.setProperty("--theme-warm-c", hexToRgba(t.amber, 0.25));
    particles.setColors(t.particleColors);
    // Titre de page dynamique + hash routing
    const project = PROJECTS()[index];
    document.title = index === SCORY_INDEX
      ? "SCORY — Agence Web Freelance"
      : `${project?.title || ""} — SCORY`;
    const slug = project?.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "") || "";
    const hash = index === SCORY_INDEX ? "" : slug;
    if (window.location.hash.slice(1) !== hash) {
      history.replaceState(null, "", hash ? `#${hash}` : window.location.pathname);
    }
  }

  /* ---------- État ---------- */
  let activeIndex = 0;
  let animating = false;
  let detailVisible = false;

  // Cache des disques (le DOM ne change jamais)
  const _discsCache = [...track.querySelectorAll(".project-disc")];
  const discs = () => _discsCache;

  /* ---------- Dots ---------- */
  function buildDots() {
    dotsContainer.innerHTML = "";
    const allDiscs = discs();
    allDiscs.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.className = "nav-dot" + (i === activeIndex ? " is-active" : "");
      dot.setAttribute("aria-label", `Projet ${i + 1} : ${PROJECTS()[i]?.title || ""}`);
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-selected", i === activeIndex ? "true" : "false");
      dot.addEventListener("click", () => goTo(i));
      dot.addEventListener("keydown", (e) => {
        const dots = [...dotsContainer.querySelectorAll(".nav-dot")];
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          const next = dots[(i + 1) % dots.length];
          next.focus(); goTo((i + 1) % dots.length);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          const prev = dots[(i - 1 + dots.length) % dots.length];
          prev.focus(); goTo((i - 1 + dots.length) % dots.length);
        }
      });
      dotsContainer.appendChild(dot);
    });
  }

  function updateDots() {
    dotsContainer.querySelectorAll(".nav-dot").forEach((d, i) => {
      d.classList.toggle("is-active", i === activeIndex);
      d.setAttribute("aria-selected", i === activeIndex ? "true" : "false");
    });
  }

  /* ---------- Label / cartel ---------- */
  function renderStack(stack) {
    labelStack.innerHTML = "";
    if (!stack) return;
    stack.forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "label-chip";
      chip.textContent = tag;
      labelStack.appendChild(chip);
    });
  }

  function setLabel(i, animate) {
    const p = PROJECTS()[i];
    if (!p) return;
    const num = String(i + 1).padStart(2, "0");
    if (!animate || reduced) {
      labelNum.textContent = num;
      labelTitle.textContent = p.title;
      labelDesc.textContent = p.desc;
      renderStack(p.stack);
      return;
    }
    const els = [labelNum, labelTitle, labelDesc, labelStack];
    gsap.to(els, {
      opacity: 0, y: -6, duration: 0.2, ease: "power2.in",
      onComplete: () => {
        labelTitle.textContent = p.title;
        labelDesc.textContent = p.desc;
        renderStack(p.stack);
        // Compteur animé sur le numéro
        const target = parseInt(num);
        const counter = { val: parseInt(labelNum.textContent) || 0 };
        gsap.to(counter, {
          val: target, duration: 0.4, ease: "power2.out",
          onUpdate: () => { labelNum.textContent = String(Math.round(counter.val)).padStart(2, "0"); },
        });
        gsap.fromTo(els,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.3, ease: "power2.out", stagger: 0.05 }
        );
      },
    });
  }

  function setActiveClasses(i) {
    discs().forEach((d, idx) => {
      const isActive = idx === i;
      d.classList.toggle("is-active", isActive);
      d.setAttribute("aria-current", isActive ? "true" : "false");
      // display:none force = impossible d'avoir du texte fantome
      d.removeAttribute("style");
      if (!isActive) d.style.display = "none";
    });
  }


  /* ---------- Navigation avec transition particules ---------- */
  async function goTo(nextIndex) {
    const d = discs();
    const n = d.length;
    if (n === 0 || animating) return;
    if (nextIndex < 0) nextIndex = n - 1;
    if (nextIndex >= n) nextIndex = 0;
    if (nextIndex === activeIndex) return;

    animating = true;
    const currentDisc = d[activeIndex];
    const goingRight = nextIndex > activeIndex || (activeIndex === n - 1 && nextIndex === 0);
    const direction = goingRight ? 1 : -1;

    if (reduced) {
      activeIndex = nextIndex;
      setActiveClasses(activeIndex);
      setLabel(activeIndex);
      updateDots();
      applyTheme(activeIndex);
      animating = false;
      showProjectBg(activeIndex);
      return;
    }

    // Mode eco: crossfade simple — zero rotation, zero static, zero GPU lourd
    if (ecoMode) {
      const nextDisc = d[nextIndex];
      gsap.to(currentDisc, {
        opacity: 0, duration: 0.3, ease: "power2.in",
        onComplete: () => {
          currentDisc.removeAttribute("style");
          currentDisc.style.display = "none";
        }
      });
      nextDisc.style.display = "grid";
      gsap.fromTo(nextDisc,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out",
          onComplete: () => {
            nextDisc.style.cssText = "";
            activeIndex = nextIndex;
            setActiveClasses(activeIndex);
            setLabel(activeIndex, true);
            updateDots();
            applyTheme(activeIndex);
            animating = false;
            showProjectBg(activeIndex);
          }
        }
      );
      return;
    }

    // Stopper la rotation
    stopSpin();
    gsap.killTweensOf(currentDisc);

    // Precharger le fond du prochain projet pendant l'animation
    getProjectBg(nextIndex).catch(() => {});

    // ===== TRANSITION MULTIPLEX — changement de chaine =====
    const nextDisc = d[nextIndex];

    // Creer l'overlay static TV (si pas deja la)
    let staticOverlay = document.getElementById("tv-static");
    if (!staticOverlay) {
      staticOverlay = document.createElement("div");
      staticOverlay.id = "tv-static";
      staticOverlay.className = "tv-static";
      stage.appendChild(staticOverlay);
    }

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(currentDisc, { clearProps: "all" });
        gsap.set(nextDisc, { clearProps: "all" });
        currentDisc.style.display = "none";
        activeIndex = nextIndex;
        setActiveClasses(activeIndex);
        setLabel(activeIndex, true);
        updateDots();
        applyTheme(activeIndex);
        animating = false;
        if (!reduced && !ecoMode) startSpin();
        showProjectBg(activeIndex);
      }
    });

    // Phase 1: le disque actuel tourne vite + glisse vers l'exterieur (0.6s)
    tl.to(currentDisc, {
      rotation: discSpinAngle + direction * 540,
      x: direction * window.innerWidth * 0.45,
      scale: 0.4,
      duration: 0.6, ease: "power2.in",
    }, 0);
    // Opacity separee — reste visible 80% du temps, fade seulement a la fin
    tl.to(currentDisc, {
      opacity: 0,
      duration: 0.2, ease: "power2.in",
    }, 0.4);

    // Static TV flash au moment de la coupure
    tl.to(staticOverlay, { opacity: 0.15, duration: 0.08 }, 0.45);
    tl.to(staticOverlay, { opacity: 0.25, duration: 0.05 }, 0.53);
    tl.to(staticOverlay, { opacity: 0.1, duration: 0.04 }, 0.58);
    tl.to(staticOverlay, { opacity: 0, duration: 0.15 }, 0.65);

    // (Neural supprime — plus de flash fond)
    if (projectBgHost) {
      tl.to(projectBgHost, { opacity: 0, duration: 0.1 }, 0.5);
    }

    // Phase 2: le nouveau disque glisse depuis l'exterieur + tourne et ralentit pour se poser (0.7s)
    nextDisc.style.display = "grid";
    tl.fromTo(nextDisc,
      { rotation: -direction * 360, x: -direction * window.innerWidth * 0.45, scale: 0.4, opacity: 1 },
      { rotation: 0, x: 0, scale: 1, opacity: 1,
        duration: 0.7, ease: "power2.out",
        onStart: () => {
          if (!ecoMode) {
            const p = { v: 0.15 };
            gsap.to(p, { v: 0, duration: 0.4, onUpdate: () => neural.setTransitionProgress(p.v) });
          }
        }
      },
      0.4 // le nouveau commence avant que l'ancien ait fini de disparaitre
    );
  }

  /* ---------- Flèches ---------- */
  arrowLeft.addEventListener("click", () => { if (!animating) goTo(activeIndex - 1); });
  arrowRight.addEventListener("click", () => { if (!animating) goTo(activeIndex + 1); });

  /* ---------- Clavier ---------- */
  carousel.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); goTo(activeIndex + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); goTo(activeIndex - 1); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && detailVisible) closeDetail();
  });

  /* ---------- Clic → panneau détails ---------- */
  const detailStack = document.getElementById("detail-stack");
  const detailCtaWrap = document.getElementById("detail-cta-wrap");

  let _glitchTitle = null;
  let _glitchText = null;

  function openDetail() {
    if (detailVisible) return;
    detailVisible = true;
    const p = PROJECTS()[activeIndex];
    if (!p) return;
    // Annuler les glitch precedents
    if (_glitchTitle) _glitchTitle.cancel();
    if (_glitchText) _glitchText.cancel();
    const t = THEMES[activeIndex];
    if (reduced) {
      detailTitle.textContent = p.title;
      detailText.textContent = p.detail;
    } else {
      detailTitle.innerHTML = "";
      detailText.innerHTML = "";
      _glitchTitle = glitchType(detailTitle, p.title, {
        charDelay: 35, glitchRounds: 4, glitchSpeed: 28, color: t?.gold ?? "var(--accent-gold)",
      });
      // Lancer le texte apres un petit delai
      setTimeout(() => {
        _glitchText = glitchType(detailText, p.detail, {
          charDelay: 8, glitchRounds: 2, glitchSpeed: 20, color: t?.magenta ?? "var(--accent-magenta)",
        });
      }, 250);
    }
    detailStack.innerHTML = "";
    if (p.stack) {
      p.stack.forEach((tag) => {
        const chip = document.createElement("span");
        chip.className = "label-chip";
        chip.textContent = tag;
        detailStack.appendChild(chip);
      });
    }
    // Bouton CTA
    detailCtaWrap.innerHTML = "";
    if (!p.url && activeIndex === SCORY_INDEX) {
      // Disque Scory → CTA vers le chatbot devis
      const cta = document.createElement("button");
      cta.type = "button";
      cta.className = "detail-panel__cta";
      cta.innerHTML = `Estimer mon projet <span class="detail-panel__cta-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg></span>`;
      cta.addEventListener("pointerup", (e) => e.stopPropagation());
      cta.addEventListener("click", (e) => {
        e.stopPropagation();
        closeDetail();
        setTimeout(() => {
          const chatSection = document.getElementById("chatbot-section");
          if (chatSection) scrollToElement(chatSection);
        }, 400);
      });
      detailCtaWrap.appendChild(cta);
    } else if (p.url) {
      const cta = document.createElement("a");
      cta.href = p.url;
      cta.target = "_blank";
      cta.rel = "noopener noreferrer";
      cta.className = "detail-panel__cta";
      cta.innerHTML = `Visiter le site <span class="detail-panel__cta-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg></span>`;
      // Empêcher la fermeture du panneau au clic sur le lien
      cta.addEventListener("pointerup", (e) => e.stopPropagation());
      cta.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Warp transition avant de naviguer
        if (!reduced) {
          const warp = { p: 0 };
          gsap.to(warp, {
            p: 1, duration: 0.8, ease: "power3.in",
            onUpdate: () => neural.setTransitionProgress(warp.p),
            onComplete: () => { window.open(p.url, "_blank"); neural.setTransitionProgress(0); },
          });
          gsap.to(document.body, { opacity: 0, duration: 0.6, delay: 0.4, onComplete: () => { gsap.set(document.body, { opacity: 1 }); } });
        } else {
          window.open(p.url, "_blank");
        }
      });
      detailCtaWrap.appendChild(cta);
    }
    // ===== OUVERTURE SIMPLE — scale + fade, GPU only =====
    const disc = _discsCache.find((d) => d.classList.contains("is-active"));
    if (!disc) return;
    stopSpin();

    // Cacher le disque
    gsap.to(disc, { opacity: 0, scale: 0.85, duration: 0.2 });

    // Ouvrir le panel
    detailPanel.classList.add("is-visible");
    detailPanel.setAttribute("aria-hidden", "false");
    stage.setAttribute("aria-hidden", "true");
    if (discHint) discHint.classList.remove("is-visible");

    gsap.fromTo(detailPanel,
      { scale: 0.5, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(1.4)" }
    );

    // Contenu stagger
    const panelChildren = detailPanel.querySelectorAll(":scope > *");
    gsap.fromTo(panelChildren,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.25, stagger: 0.03, delay: 0.2, ease: "power2.out" }
    );

    _detailPrevFocus = document.activeElement;
    requestAnimationFrame(() => { _detailFocusTrap = trapFocus(detailPanel); });

    // Fermer au clic en dehors
    _closeOnOutsideRef = (e) => {
      if (detailPanel.contains(e.target)) return;
      closeDetail();
    };
    setTimeout(() => {
      document.addEventListener("pointerdown", _closeOnOutsideRef, true);
    }, CLOSE_OUTSIDE_DELAY_MS);
  }

  let _closeOnOutsideRef = null;
  let _detailFocusTrap = null;
  let _detailPrevFocus = null;

  function closeDetail() {
    if (!detailVisible) return;
    detailVisible = false;
    if (_glitchTitle) { _glitchTitle.cancel(); _glitchTitle = null; }
    if (_glitchText) { _glitchText.cancel(); _glitchText = null; }
    stage.removeAttribute("aria-hidden");
    if (_closeOnOutsideRef) {
      document.removeEventListener("pointerdown", _closeOnOutsideRef, true);
      _closeOnOutsideRef = null;
    }
    if (_detailFocusTrap) { _detailFocusTrap(); _detailFocusTrap = null; }

    const disc = _discsCache.find((d) => d.classList.contains("is-active"));

    // Panel shrink + fade — simple et fluide
    gsap.to(detailPanel, {
      scale: 0.5, opacity: 0,
      duration: 0.25, ease: "power2.in",
      onComplete: () => {
        detailPanel.classList.remove("is-visible");
        detailPanel.setAttribute("aria-hidden", "true");
        gsap.set(detailPanel, { clearProps: "scale,opacity" });

        // Disque reapparait
        if (disc) {
          gsap.to(disc, {
            opacity: 1, scale: 1, rotation: discSpinAngle,
            duration: 0.35, ease: "back.out(1.5)",
            onComplete: () => { if (!reduced && !ecoMode) startSpin(); }
          });
        } else if (!reduced && !ecoMode) {
          startSpin();
        }
      }
    });

    if (_detailPrevFocus) { _detailPrevFocus.focus(); _detailPrevFocus = null; }
    _holdActive = false;
    _holdDisc = null;
  }

  /* Bouton X ferme le detail */
  const detailCloseBtn = document.getElementById("detail-close");
  if (detailCloseBtn) {
    detailCloseBtn.addEventListener("click", (e) => { e.stopPropagation(); e.preventDefault(); closeDetail(); });
    detailCloseBtn.addEventListener("touchend", (e) => { e.stopPropagation(); e.preventDefault(); closeDetail(); });
  }

  /* Clic / Long press sur le disque actif → animation + details */
  let _holdTimer = null;
  let _holdActive = false;
  let _holdDisc = null;

  function discPrepareOpen(disc) {
    _holdActive = true;
    _holdDisc = disc;
    stopSpin();
    // Le disque grossit et se redresse
    gsap.to(disc, {
      scale: 1.12, rotation: 0, rotateX: 0, rotateY: 0,
      duration: 0.5, ease: "back.out(1.4)",
      boxShadow: "0 0 60px var(--theme-glow-strong)",
    });
  }

  function discOpenDetail() {
    if (!_holdActive || detailVisible) return;
    openDetail();
  }

  function discRestore() {
    clearTimeout(_holdTimer);
    _holdTimer = null;
    if (!_holdDisc) return;
    const disc = _holdDisc;
    _holdActive = false;
    _holdDisc = null;

    if (!detailVisible) {
      // Pas ouvert → retour direct
      gsap.to(disc, {
        scale: 1, rotation: discSpinAngle,
        duration: 0.6, ease: "elastic.out(1, 0.5)",
        onComplete: () => { if (!reduced && !ecoMode) startSpin(); }
      });
    }
  }

  // Touch : long press → prepare → release → open
  carousel.addEventListener("touchstart", (e) => {
    if (animating || detailVisible) return;
    const target = e.target.closest(".project-disc");
    if (!target || !target.classList.contains("is-active")) return;
    _holdTimer = setTimeout(() => discPrepareOpen(target), 200);
  }, { passive: true });

  carousel.addEventListener("touchend", (e) => {
    if (_holdActive) {
      e.preventDefault();
      discOpenDetail();
    } else {
      // Tap court → ouvre directement
      clearTimeout(_holdTimer);
      const target = e.target.closest(".project-disc");
      if (target && target.classList.contains("is-active") && !animating && !detailVisible) {
        openDetail();
      }
    }
  });

  carousel.addEventListener("touchcancel", () => discRestore());

  // Desktop : clic simple ouvre directement (le tilt 3D gere le hover)
  carousel.addEventListener("click", (e) => {
    if (isTouchDevice) return;
    if (animating || detailVisible) return;
    const target = e.target.closest(".project-disc");
    if (target && target.classList.contains("is-active")) {
      stopSpin();
      gsap.to(target, {
        scale: 1.08, rotation: 0, rotateX: 0, rotateY: 0,
        duration: 0.3, ease: "power2.out",
        onComplete: () => openDetail()
      });
    }
  });

  /* ---------- Swipe tactile avec velocite ---------- */
  let swipeStartX = 0;
  let swipeStartTime = 0;
  carousel.addEventListener("touchstart", (e) => {
    swipeStartX = e.touches[0].clientX;
    swipeStartTime = Date.now();
  }, { passive: true });
  carousel.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - swipeStartX;
    const dt = Date.now() - swipeStartTime;
    const velocity = Math.abs(dx) / Math.max(dt, 1);
    // Swipe rapide (velocity > 0.3) ou long (> 60px)
    const isSwipe = (Math.abs(dx) > SWIPE_DISTANCE_FAST && velocity > SWIPE_VELOCITY_MIN) || Math.abs(dx) > SWIPE_DISTANCE_SLOW;
    if (isSwipe && !animating) {
      if (dx < 0) goTo(activeIndex + 1);
      else goTo(activeIndex - 1);
    }
  });

  /* ---------- Resize (debounced) ---------- */
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      neural.resize();
      particles.resize();
    }, RESIZE_DEBOUNCE_MS);
  }, { passive: true });

  /* ---------- Curseur custom (module cursor.js) ---------- */
  initCursor({ neural, reduced });
  initMagneticArrows([arrowLeft, arrowRight]);

  // Rotation lente continue du disque actif (guard contre double boucle)
  let discSpinAngle = 0;
  let discSpinActive = false;
  let discSpinRaf = 0;
  function spinDisc() {
    if (!discSpinActive) return;
    discSpinAngle += DISC_SPIN_SPEED;
    const disc = _discsCache.find((d) => d.classList.contains("is-active"));
    if (disc && !animating) {
      disc.style.transform = `rotate(${discSpinAngle}deg)`;
    }
    discSpinRaf = requestAnimationFrame(spinDisc);
  }
  function startSpin() {
    if (discSpinActive) return; // guard : pas de double boucle
    discSpinActive = true;
    spinDisc();
  }
  function stopSpin() {
    discSpinActive = false;
    cancelAnimationFrame(discSpinRaf);
  }
  if (!reduced && !ecoMode) startSpin();

  // Tilt 3D au survol (pause la rotation, ajoute le tilt)
  const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  if (!isTouchDevice && !reduced && !ecoMode) {
    carousel.addEventListener("mouseenter", () => {
      stopSpin();
    });
    let _mmRaf = 0;
    carousel.addEventListener("mousemove", (e) => {
      if (animating) return;
      cancelAnimationFrame(_mmRaf);
      _mmRaf = requestAnimationFrame(() => {
        const disc = discs().find((d) => d.classList.contains("is-active"));
        if (!disc) return;
        const rect = disc.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        gsap.to(disc, {
          rotateY: x * 14, rotateX: -y * 14,
          rotation: discSpinAngle,
          duration: 0.4, ease: "power2.out",
        });
      });
    });
    carousel.addEventListener("mouseleave", () => {
      const disc = discs().find((d) => d.classList.contains("is-active"));
      if (disc) {
        gsap.to(disc, {
          rotateY: 0, rotateX: 0, duration: 0.6, ease: "power2.out",
          onComplete: () => startSpin(),
        });
      } else {
        startSpin();
      }
    });
  }

  /* ---------- Init ---------- */
  // Hash routing: naviguer au projet si #slug dans l'URL
  let startIndex = 0;
  const initialHash = window.location.hash.slice(1);
  if (initialHash) {
    const projects = PROJECTS();
    const matchIdx = projects.findIndex((p) =>
      p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "") === initialHash
    );
    if (matchIdx >= 0) startIndex = matchIdx;
  }

  setActiveClasses(startIndex);
  setLabel(startIndex);
  activeIndex = startIndex;
  buildDots();
  applyTheme(startIndex);


  if (reduced) {
    neural.setRotationInfluence(0);
    neural.setTransitionProgress(0);
  }

  await yieldToBrowser(); // Liberer le main thread avant les observers

  /* ---------- Pause quand onglet cache ---------- */
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopSpin();
      if (activeProjectBg) activeProjectBg.stop();
    } else {
      if (!reduced && !animating) startSpin();
      if (activeProjectBg) activeProjectBg.start();
    }
  });

  /* ---------- Pause Three.js hors ecran ---------- */
  const stageVisibility = new IntersectionObserver((entries) => {
    const visible = entries[0].isIntersecting;
    if (!visible) {
      stopSpin();
      if (activeProjectBg) activeProjectBg.stop();
    } else {
      if (!reduced && !animating) startSpin();
      if (activeProjectBg) activeProjectBg.start();
    }
  }, { threshold: 0.05 });
  stageVisibility.observe(stage);

  await yieldToBrowser(); // Liberer avant les observers scroll

  /* ---------- Scroll Reveal (enhanced mobile) ---------- */
  const isMobileView = window.innerWidth <= 600;
  const revealElements = document.querySelectorAll(".reveal");
  if (revealElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          // Mobile: stagger les enfants pour un effet cascade
          if (isMobileView && !reduced) {
            const children = entry.target.querySelectorAll(".stat-card, .process-card, .about-value, .contact-card, .service-card, .testimonial");
            children.forEach((child, i) => {
              child.style.opacity = "0";
              child.style.transform = "translateY(20px)";
              child.style.transition = `opacity 0.6s ease ${i * 0.1}s, transform 0.6s ease ${i * 0.1}s`;
              requestAnimationFrame(() => {
                child.style.opacity = "1";
                child.style.transform = "translateY(0)";
              });
            });
          }
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: isMobileView ? 0.08 : 0.15, rootMargin: "0px 0px -40px 0px" });
    revealElements.forEach((el) => revealObserver.observe(el));
  }

  /* ---------- Teleportation sections (vide → mi-vide → rempli + rebond) ---------- */
  const teleportSections = document.querySelectorAll(".stats-section, .services-section, .process-section, .about-section, .testimonials-section");
  if (teleportSections.length > 0 && !reduced && !ecoMode) {
    teleportSections.forEach((section) => {
      gsap.set(section, { opacity: 0, scale: 0.3, y: 60, filter: "blur(8px)" });
      const obs = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        obs.disconnect();
        // Phase 1 : teleportation — apparition flash semi-visible (0 → 0.4)
        gsap.to(section, {
          opacity: 0.4, scale: 0.7, y: 20, filter: "blur(4px)",
          duration: 0.4, ease: "power4.out",
        });
        // Phase 2 : materialisation — devient plein avec rebond (0.4 → 1)
        gsap.to(section, {
          opacity: 1, scale: 1, y: 0, filter: "blur(0px)",
          duration: 2.6, ease: "elastic.out(1, 0.35)",
          delay: 0.4,
          onComplete: () => gsap.set(section, { clearProps: "all" }),
        });
        // Stagger enfants (cartes) pour un effet cascade
        const cards = section.querySelectorAll(".glass-panel, .section-title, .about-mission, .about-philosophy, .about-values");
        if (cards.length > 0) {
          gsap.fromTo(cards,
            { opacity: 0, y: 30, scale: 0.8 },
            { opacity: 1, y: 0, scale: 1, duration: 1.5, stagger: 0.15, ease: "elastic.out(1, 0.4)", delay: 0.6 }
          );
        }
      }, { threshold: 0.08 });
      obs.observe(section);
    });
  }

  /* ---------- CTA flottant — auto-hide quand chatbot visible ---------- */
  const floatingCta = document.getElementById("floating-cta");
  if (floatingCta) {
    floatingCta.addEventListener("click", () => {
      const chatSection = document.getElementById("chatbot-section");
      if (chatSection) scrollToElement(chatSection);
    });
    const chatSection = document.getElementById("chatbot-section");
    if (chatSection) {
      const ctaObs = new IntersectionObserver((entries) => {
        floatingCta.classList.toggle("is-hidden", entries[0].isIntersecting);
      }, { threshold: 0.15 });
      ctaObs.observe(chatSection);
    }
  }

  /* ---------- Auto-open detail panel apres 3s sur le premier disque ---------- */
  if (!reduced && startIndex === SCORY_INDEX) {
    setTimeout(() => {
      if (!detailVisible && activeIndex === SCORY_INDEX && !animating) {
        openDetail();
      }
    }, 3500);
  }

  /* ---------- Overscroll elastique progressif ---------- */
  const overscrollBottom = document.getElementById("overscroll-panel");
  const overscrollTop = document.getElementById("overscroll-top");
  const osProgress = document.getElementById("overscroll-progress");
  const osStages = [
    document.getElementById("os-stage-1"),
    document.getElementById("os-stage-2"),
    document.getElementById("os-stage-3"),
    document.getElementById("os-stage-win"),
  ];
  let _overscrollCooldown = false;
  let _osAccum = 0;
  let _osCurrentStage = -1;
  let _osWon = false;
  let _osStageUnlockTime = 0;
  const OS_THRESHOLD = innerHeight * 0.8; // presque tout l'ecran pour gagner

  function updateOverscrollStage(progress) {
    // progress: 0 → 1 (1 = 80% de l'ecran)
    const clamped = Math.min(1, Math.max(0, progress));
    if (osProgress) osProgress.style.setProperty("--os-progress", (clamped * 100) + "%");

    const now = Date.now();
    let stage = -1;
    if (clamped > 0.01) stage = 0;  // yeux — debut
    if (clamped > 0.35) stage = 1;  // insiste — un bon tiers
    if (clamped > 0.70) stage = 2;  // NOOON — presque la
    if (clamped >= 0.95) stage = 3;  // WIN — faut vraiment le vouloir

    // Delai entre chaque stage (500ms minimum)
    if (stage > _osCurrentStage && now - _osStageUnlockTime < 500) {
      stage = _osCurrentStage;
    }

    if (stage !== _osCurrentStage && stage >= 0) {
      _osCurrentStage = stage;
      _osStageUnlockTime = now;
      osStages.forEach((s, i) => { if (s) s.style.display = i === stage ? "block" : "none"; });
    }

    if (stage >= 0 && !overscrollBottom.classList.contains("is-visible")) {
      overscrollBottom.classList.add("is-visible");
    }

    if (stage === 3 && !_osWon) {
      _osWon = true;
      _overscrollCooldown = true;
      if (navigator.vibrate) navigator.vibrate([100, 50, 200]);
      // Sauvegarder le discount
      localStorage.setItem("scory_discount", "SCROLL5");
      // Apres 2s → fermer le panneau, scroll vers le chatbot, injecter message
      setTimeout(() => {
        overscrollBottom.classList.remove("is-visible");
        _overscrollCooldown = true;
        const chatSection = document.getElementById("chatbot-section");
        if (chatSection) scrollToElement(chatSection);
        setTimeout(() => injectDiscountMessage(), 1200);
      }, 2000);
    }
  }

  function resetOverscroll() {
    if (_osWon) return; // garder le panneau win visible
    _osAccum = 0;
    _osCurrentStage = -1;
    if (overscrollBottom) overscrollBottom.classList.remove("is-visible");
    if (osProgress) osProgress.style.setProperty("--os-progress", "0%");
    osStages.forEach((s, i) => { if (s) s.style.display = i === 0 ? "block" : "none"; });
  }

  // Touch: progressif + blocage pull-to-refresh natif
  let _touchStartY = 0;
  let _touchIsAtEdge = false;

  document.addEventListener("touchstart", (e) => {
    _touchStartY = e.touches[0].clientY;
    if (!_osWon) _osAccum = 0;
    // Detecter si on est au bord (haut ou bas) au debut du touch
    const atTop = window.scrollY <= 0;
    const atBottom = (innerHeight + window.scrollY) >= document.body.scrollHeight - 5;
    _touchIsAtEdge = atTop || atBottom;
  }, { passive: true });

  // Non-passive pour pouvoir preventDefault et bloquer le pull-to-refresh natif iOS
  document.addEventListener("touchmove", (e) => {
    if (_overscrollCooldown) return;
    const currentY = e.touches[0].clientY;
    const dy = _touchStartY - currentY; // positif = scroll down
    const pullDown = currentY - _touchStartY; // positif = tire vers le bas
    const atBottom = (innerHeight + window.scrollY) >= document.body.scrollHeight - 5;
    const atTop = window.scrollY <= 0;

    // Bloquer le pull-to-refresh natif quand on est en haut et qu'on tire vers le bas
    if (atTop && pullDown > 0 && _touchIsAtEdge) {
      e.preventDefault(); // bloque le refresh natif Safari/Chrome
    }

    // Overscroll bas — panneau progressif
    if (atBottom && dy > 10) {
      e.preventDefault();
      updateOverscrollStage(dy / OS_THRESHOLD);
    }

    // Pull-to-refresh custom haut
    if (atTop && pullDown > 100 && overscrollTop) {
      _overscrollCooldown = true;
      overscrollTop.classList.add("is-visible");
      setTimeout(() => { window.location.reload(); }, 1200);
    }
  }, { passive: false }); // NON-PASSIVE pour pouvoir preventDefault

  document.addEventListener("touchend", () => {
    if (!_osWon && !_overscrollCooldown) resetOverscroll();
  }, { passive: true });

  // Desktop: wheel progressif
  let _wheelTimer = null;
  window.addEventListener("wheel", (e) => {
    if (_overscrollCooldown) return;
    const atBottom = (innerHeight + window.scrollY) >= document.body.scrollHeight - 5;
    const atTop = window.scrollY <= 0;

    if (atBottom && e.deltaY > 0) {
      _osAccum += e.deltaY;
      clearTimeout(_wheelTimer);
      _wheelTimer = setTimeout(() => { if (!_osWon) resetOverscroll(); }, 800);
      updateOverscrollStage(_osAccum / (OS_THRESHOLD * 3));
    } else if (atTop && e.deltaY < 0) {
      _osAccum += Math.abs(e.deltaY);
      clearTimeout(_wheelTimer);
      _wheelTimer = setTimeout(() => { _osAccum = 0; }, 500);
      if (_osAccum > 300 && overscrollTop) {
        _overscrollCooldown = true;
        overscrollTop.classList.add("is-visible");
        setTimeout(() => { window.location.reload(); }, 1200);
      }
    } else {
      if (!_osWon) { _osAccum = 0; resetOverscroll(); }
    }
  }, { passive: true });

  /* ---------- Overscroll CTA → chatbot ---------- */
  const overscrollCta = document.getElementById("overscroll-cta");
  if (overscrollCta) {
    overscrollCta.addEventListener("click", () => {
      overscrollBottom.classList.remove("is-visible");
      const cs = document.getElementById("chatbot-section");
      if (cs) scrollToElement(cs);
    });
  }

  /* ---------- Discount message injection ---------- */
  function injectDiscountMessage() {
    const msgContainer = document.getElementById("chatbot-messages");
    if (!msgContainer) return;

    const msg = document.createElement("div");
    msg.className = "chat-msg chat-msg--bot chat-msg--discount";
    msg.innerHTML = `
      <span style="font-size:1.5rem;display:block;margin-bottom:0.4rem;">🎉🎉🎉</span>
      <strong>FELICITATIONS !</strong> Vous avez decouvert le secret !<br><br>
      Vous venez de debloquer <strong style="color:var(--accent-gold);">-5% de discount</strong> sur votre prochain projet.<br><br>
      Code : <strong style="color:var(--accent-gold);letter-spacing:0.1em;">SCROLL5</strong><br><br>
      Allez, estimez votre projet — le discount est deja applique ! 👇
    `;
    msg.style.opacity = "0";
    msg.style.transform = "translateY(10px)";
    msgContainer.appendChild(msg);
    msgContainer.scrollTop = msgContainer.scrollHeight;

    gsap.to(msg, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" });
  }

  /* ---------- Scroll hint click → chatbot ---------- */
  const scrollHint = document.querySelector(".scroll-hint");
  if (scrollHint) {
    scrollHint.style.cursor = "pointer";
    scrollHint.addEventListener("click", () => {
      const chatSection = document.getElementById("chatbot-section");
      if (chatSection) scrollToElement(chatSection);
    });
  }

  /* ---------- Stats animation (compteurs) ---------- */
  const statCards = document.querySelectorAll(".stat-card");
  if (statCards.length > 0) {
    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const card = entry.target;
        const numEl = card.querySelector(".stat-number");
        if (card.dataset.text) { statsObserver.unobserve(card); return; }
        const target = parseInt(card.dataset.target, 10);
        const suffix = card.dataset.suffix || "";
        const counter = { val: 0 };
        gsap.to(counter, {
          val: target, duration: 2, ease: "power2.out",
          onUpdate: () => { numEl.textContent = Math.round(counter.val) + suffix; },
        });
        statsObserver.unobserve(card);
      });
    }, { threshold: 0.5 });
    statCards.forEach((c) => statsObserver.observe(c));
  }

  /* ---------- Contact stagger ---------- */
  const contactGrid = document.querySelector(".contact-grid");
  if (contactGrid && !reduced) {
    const contactObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        gsap.fromTo(contactGrid.children,
          { opacity: 0, y: 40, scale: 0.8 },
          { opacity: 1, y: 0, scale: 1, duration: 1.5, stagger: 0.12, ease: "elastic.out(1, 0.4)" }
        );
        contactObserver.disconnect();
      }
    }, { threshold: 0.15 });
    contactObserver.observe(contactGrid);
  }

  /* ---------- Disc hint mobile (swipe + tap) — flash toutes les 8s ---------- */
  const discHint = document.getElementById("disc-hint");
  let _discHintInterval = null;

  if (discHint && "ontouchstart" in window) {
    function flashHint() {
      if (detailVisible || animating) return;
      discHint.classList.remove("is-visible");
      void discHint.offsetHeight; // force reflow pour relancer l'animation
      discHint.classList.add("is-visible");
    }

    // Premier flash apres 2s, puis toutes les 8s
    setTimeout(flashHint, 2000);
    _discHintInterval = setInterval(flashHint, 8000);
  }

  /* ---------- Son ambiant (module audio.js) ---------- */
  initAudio();

  /* ---------- Easter Egg (Konami Code) ---------- */
  const KONAMI = [38,38,40,40,37,39,37,39,66,65];
  let konamiIdx = 0;
  const easterEgg = document.getElementById("easter-egg");
  document.addEventListener("keydown", (e) => {
    if (e.keyCode === KONAMI[konamiIdx]) {
      konamiIdx++;
      if (konamiIdx === KONAMI.length) {
        konamiIdx = 0;
        if (easterEgg) {
          easterEgg.style.opacity = "0";
          easterEgg.classList.add("is-visible");
          const rect = { left: innerWidth / 2 - 100, top: innerHeight / 2 - 100, width: 200, height: 200 };
          particles.transition(rect, 0);
          gsap.to(easterEgg, { opacity: 1, duration: 0.5 });
          setTimeout(() => {
            gsap.to(easterEgg, { opacity: 0, duration: 1, onComplete: () => {
              easterEgg.classList.remove("is-visible");
              easterEgg.style.opacity = "";
            }});
          }, 3500);
        }
      }
    } else { konamiIdx = 0; }
  });

  /* ---------- Chatbot + Booking (sequentiel) ---------- */
  let chatStateRef = { completed: false };
  let bookingApi = null;
  import("./chatbot.js").then(({ initChatbot, chatState }) => {
    chatStateRef = chatState;
    initChatbot({
      isValidEmail,
      onComplete: () => { if (bookingApi) bookingApi.openBooking(); },
    });
    return import("./booking.js");
  }).then(({ initBooking }) => {
    bookingApi = initBooking({
      trapFocus, isValidEmail, contactEmail: CONTACT_EMAIL,
      getChatCompleted: () => chatStateRef.completed,
    });
  });
}

/* ---------- Boot ---------- */
// Applique eco-mode si sauvegarde
initEcoMode();

try {
  main();
} catch (err) {
  console.error("SCORY init error:", err);
  document.body.classList.add("no-webgl");
  const loader = document.getElementById("loader");
  if (loader) loader.classList.add("is-hidden");
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
