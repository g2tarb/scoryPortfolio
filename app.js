/**
 * SCORY — app.js
 * Carrousel disques, transitions particules, chatbot devis, booking.
 * Three.js charge en differe pour ne pas bloquer le main thread.
 */
import gsap from "gsap";
import { PROJECTS as PROJECTS_ALL, THEMES, CHAT_FLOW as CHAT_FLOW_ALL } from "./data.js";
import { getLang, setLang, t } from "./i18n.js";

/** Getters bilingues */
function PROJECTS() { return PROJECTS_ALL[getLang()] || PROJECTS_ALL.fr; }
function CHAT_FLOW() { return CHAT_FLOW_ALL[getLang()] || CHAT_FLOW_ALL.fr; }

/* ---------- Constantes ---------- */
const EASE_SPRING_HEAVY = "back.out(1.32)";
const LOADER_DELAY_MS = 1500;
const CLOSE_OUTSIDE_DELAY_MS = 600;
const WATER_FADE_DELAY_MS = 5000;
const DISC_SPIN_SPEED = 0.06;
const CURSOR_THROTTLE_MS = 16;
const RESIZE_DEBOUNCE_MS = 100;
const SWIPE_VELOCITY_MIN = 0.3;
const SWIPE_DISTANCE_FAST = 40;
const SWIPE_DISTANCE_SLOW = 60;
const SCORY_INDEX = 0;
const CONTACT_EMAIL = "gdbyana@gmail.com";

/** @param {string[]} urls - URLs des images a precharger */
function preloadImages(urls) {
  urls.forEach((url) => {
    if (!url) return;
    const img = new Image();
    img.src = url;
  });
}

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

async function main() {
  const stage = document.getElementById("museum-stage");
  const neuralHost = document.getElementById("neural-host");
  const waterHost = document.getElementById("water-host");
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
  const loader = document.getElementById("loader");
  const projectBgHost = document.getElementById("project-bg-host");

  /* ===== PHASE 1 : Loader + carrousel sans Three.js ===== */
  // Stub neural tant que Three.js n'est pas charge
  let neural = { resize() {}, setTransitionProgress() {}, setRotationInfluence() {} };

  /* ===== PHASE 2 : Three.js charge en arriere-plan ===== */
  const threeReady = import("./three-neural.js").then(({ FlaynnNeuralBackground }) => {
    try {
      neural = new FlaynnNeuralBackground(neuralHost, { timeScale: reduced ? 0.22 : 1 });
    } catch {
      document.body.classList.add("no-webgl");
    }
  }).catch(() => { document.body.classList.add("no-webgl"); });

  /* ---------- Fonds projet (initialisés au premier usage) ---------- */
  const projectBgs = {};
  let activeProjectBg = null;

  async function getProjectBg(index) {
    if (projectBgs[index]) return projectBgs[index];
    if (!projectBgHost) return null;
    try {
      switch (index) {
        case 1: { const { UniverseBackground } = await import("./universe.js"); projectBgs[1] = new UniverseBackground(projectBgHost); break; }
        case 2: { const { AuroraBorealis } = await import("./aurora.js"); projectBgs[2] = new AuroraBorealis(projectBgHost); break; }
        case 3: { const { FlaynnNebula } = await import("./nebula-flaynn.js"); projectBgs[3] = new FlaynnNebula(projectBgHost); break; }
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
    if (index === 0 || !projectBgHost) {
      gsap.to(projectBgHost, { opacity: 0, duration: 1 });
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
  // Three.js lance le fond quand il est pret
  threeReady.then(() => void syncProjectWater());

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

  let water = null;
  let waterSplashTween = null;
  let waterFadeTimer = null;
  let WaterReflectionLayer = null;
  async function ensureWater() {
    if (!water && waterHost) {
      if (!WaterReflectionLayer) {
        const mod = await import("./three-water.js");
        WaterReflectionLayer = mod.WaterReflectionLayer;
      }
      water = new WaterReflectionLayer(waterHost, { timeScale: reduced ? 0.22 : 1 });
    }
  }
  if (waterHost) gsap.set(waterHost, { opacity: 0 });
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
    // Titre de page dynamique
    const project = PROJECTS()[index];
    document.title = index === SCORY_INDEX
      ? "SCORY — Musee Digital"
      : `${project?.title || ""} — SCORY`;
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

  /* ---------- Fond eau / neural / projet ---------- */
  async function syncProjectWater() {
    if (!waterHost) return;
    await ensureWater();
    if (!water) return;

    // Annuler tout timer de crossfade précédent
    if (waterFadeTimer) { clearTimeout(waterFadeTimer); waterFadeTimer = null; }
    hideProjectBg();

    // Disque Scory (index 0) → fond neural Three.js seul, pas d'image
    if (activeIndex === SCORY_INDEX) {
      if (waterSplashTween) waterSplashTween.kill();
      gsap.to(neuralHost, { opacity: 1, duration: 0.8, ease: "power2.out" });
      gsap.to(waterHost, { opacity: 0, duration: 0.8, ease: "power2.out" });
      return;
    }

    const el = discs()[activeIndex];
    const isMobile = window.innerWidth <= 600;
    const url = (isMobile && el?.dataset?.imageMobile) || el?.dataset?.image;
    if (!url) return;
    try {
      await water.loadTexture(url);
    } catch {
      // Image indisponible : passer directement au fond projet
      gsap.to(neuralHost, { opacity: 0, duration: 1 });
      showProjectBg(activeIndex);
      return;
    }
    runWaterSplash();
  }

  function runWaterSplash() {
    if (!water || !waterHost) return;
    if (waterSplashTween) waterSplashTween.kill();
    if (waterFadeTimer) { clearTimeout(waterFadeTimer); waterFadeTimer = null; }

    if (reduced) {
      water.setProgress(0.12);
      gsap.set(neuralHost, { opacity: 0.2 });
      gsap.set(waterHost, { opacity: 1 });
      return;
    }

    water.setProgress(1);
    const proxy = { p: 1 };
    waterSplashTween = gsap.timeline()
      .to(neuralHost, { opacity: 0.14, duration: 1.15, ease: "power2.out" }, 0)
      .to(waterHost, { opacity: 1, duration: 1.05, ease: "power2.out" }, 0)
      .to(proxy, {
        p: 0.1, duration: 2.45, ease: "power3.out",
        onUpdate: () => water.setProgress(proxy.p),
      }, 0);

    // Après gel image (3s) + 2s pause → crossfade vers le vrai fond du projet
    waterFadeTimer = setTimeout(() => { // image gelee + pause
      gsap.to(waterHost, { opacity: 0, duration: 2, ease: "power2.inOut" });
      gsap.to(neuralHost, { opacity: 0, duration: 2, ease: "power2.inOut" });
      showProjectBg(activeIndex);
    }, WATER_FADE_DELAY_MS);
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
      void syncProjectWater();
      return;
    }

    // Stopper la rotation du disque AVANT la transition
    stopSpin();

    // Tuer toute animation GSAP residuelle sur les disques
    d.forEach((disc) => gsap.killTweensOf(disc));

    // Position du disque pour les particules
    const rect = currentDisc.getBoundingClientRect();

    // Masquer le disque courant
    currentDisc.removeAttribute("style");
    currentDisc.style.display = "none";

    // Transition shader neural
    const tProxy = { p: 0 };
    gsap.to(tProxy, {
      p: 1, duration: 1.2, ease: "power2.inOut",
      onUpdate: () => neural.setTransitionProgress(tProxy.p),
      onComplete: () => neural.setTransitionProgress(0),
    });

    // Transition particules
    await particles.transition(rect, direction);

    // Nettoyer TOUS les disques — display:none sauf le nouveau
    d.forEach((disc) => {
      gsap.killTweensOf(disc);
      disc.removeAttribute("style");
      disc.style.display = "none";
    });

    // Mettre a jour l'etat
    activeIndex = nextIndex;
    setActiveClasses(activeIndex);
    setLabel(activeIndex, true);
    updateDots();
    applyTheme(activeIndex);

    // Faire apparaitre le nouveau disque
    const nextDisc = d[activeIndex];
    nextDisc.style.display = "grid";
    gsap.fromTo(nextDisc,
      { opacity: 0, scale: 0.9 },
      {
        opacity: 1, scale: 1, duration: 0.35, ease: EASE_SPRING_HEAVY, overwrite: true,
        onComplete: () => {
          // Garder display:grid, nettoyer le reste
          nextDisc.style.cssText = "";
          startSpin();
        },
      }
    );

    animating = false;
    preloadNearby(activeIndex);
    void syncProjectWater();
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
  const detailScreenshots = document.getElementById("detail-screenshots");

  function openDetail() {
    if (detailVisible) return;
    detailVisible = true;
    const p = PROJECTS()[activeIndex];
    if (!p) return;
    detailTitle.textContent = p.title;
    detailText.textContent = p.detail;
    detailStack.innerHTML = "";
    if (p.stack) {
      p.stack.forEach((tag) => {
        const chip = document.createElement("span");
        chip.className = "label-chip";
        chip.textContent = tag;
        detailStack.appendChild(chip);
      });
    }
    // Screenshots
    detailScreenshots.innerHTML = "";
    if (p.screenshots && p.screenshots.length > 0) {
      p.screenshots.forEach((src) => {
        const img = document.createElement("img");
        img.src = src;
        img.alt = `Capture de ${p.title}`;
        img.className = "detail-panel__screenshot";
        img.loading = "lazy";
        img.onerror = () => img.remove();
        detailScreenshots.appendChild(img);
      });
    }
    // Bouton CTA « Visiter le site »
    detailCtaWrap.innerHTML = "";
    if (p.url) {
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
    detailPanel.classList.add("is-visible");
    detailPanel.setAttribute("aria-hidden", "false");
    _detailPrevFocus = document.activeElement;
    requestAnimationFrame(() => { _detailFocusTrap = trapFocus(detailPanel); });
    // Fermer au clic en dehors du panneau
    _closeOnOutsideRef = (e) => {
      if (!detailPanel.contains(e.target)) {
        closeDetail();
      }
    };
    // Attendre que le long press soit fini (le prochain clic fermera)
    setTimeout(() => {
      document.addEventListener("click", _closeOnOutsideRef, true);
    }, CLOSE_OUTSIDE_DELAY_MS);
  }

  let _closeOnOutsideRef = null;
  let _detailFocusTrap = null;
  let _detailPrevFocus = null;

  function closeDetail() {
    if (!detailVisible) return;
    detailVisible = false;
    detailPanel.classList.remove("is-visible");
    detailPanel.setAttribute("aria-hidden", "true");
    if (_closeOnOutsideRef) {
      document.removeEventListener("click", _closeOnOutsideRef, true);
      _closeOnOutsideRef = null;
    }
    if (_detailFocusTrap) { _detailFocusTrap(); _detailFocusTrap = null; }
    if (_detailPrevFocus) { _detailPrevFocus.focus(); _detailPrevFocus = null; }
  }

  /* Bouton X ferme le detail */
  const detailCloseBtn = document.getElementById("detail-close");
  if (detailCloseBtn) detailCloseBtn.addEventListener("click", (e) => { e.stopPropagation(); closeDetail(); });

  /* Clic sur le disque actif → ouvre les détails */
  carousel.addEventListener("click", (e) => {
    if (animating || detailVisible) return;
    const target = e.target.closest(".project-disc");
    if (target && target.classList.contains("is-active")) {
      openDetail();
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
      if (water) water.resize();
      particles.resize();
    }, RESIZE_DEBOUNCE_MS);
  }, { passive: true });

  /* ---------- Curseur custom + Tilt 3D + Neural feedback ---------- */
  const cursorDot = document.getElementById("cursor-dot");
  const cursorRing = document.getElementById("cursor-ring");
  const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  if (!isTouchDevice && cursorDot && cursorRing) {
    let lastCursorFrame = 0;
    document.addEventListener("mousemove", (e) => {
      // Dot instantané (pas de throttle)
      gsap.set(cursorDot, { x: e.clientX, y: e.clientY });
      // Ring + neural throttlé à ~60fps
      const now = performance.now();
      if (now - lastCursorFrame < CURSOR_THROTTLE_MS) return;
      lastCursorFrame = now;
      gsap.to(cursorRing, { x: e.clientX, y: e.clientY, duration: 0.28, ease: "power2.out" });
      if (!reduced) {
        const influence = Math.hypot(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5) * 0.35;
        neural.setRotationInfluence(influence);
      }
    }, { passive: true });
    // Hover ring sur éléments interactifs
    document.addEventListener("mouseover", (e) => {
      const hit = e.target.closest("a, button, .project-disc, .chat-pill, .nav-dot, .nav-arrow, input");
      cursorRing.classList.toggle("is-hover", !!hit);
    });
  }

  // Effet magnétique sur les flèches
  if (!isTouchDevice) {
    [arrowLeft, arrowRight].forEach((arrow) => {
      const svg = arrow.querySelector("svg");
      arrow.addEventListener("mousemove", (e) => {
        const rect = arrow.getBoundingClientRect();
        const dx = (e.clientX - rect.left - rect.width / 2) * 0.35;
        const dy = (e.clientY - rect.top - rect.height / 2) * 0.35;
        gsap.to(svg, { x: dx, y: dy, duration: 0.25, ease: "power2.out" });
      });
      arrow.addEventListener("mouseleave", () => {
        gsap.to(svg, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" });
      });
    });
  }

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
  if (!reduced) startSpin();

  // Tilt 3D au survol (pause la rotation, ajoute le tilt)
  if (!isTouchDevice && !reduced) {
    carousel.addEventListener("mouseenter", () => {
      stopSpin();
    });
    carousel.addEventListener("mousemove", (e) => {
      if (animating) return;
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
  setActiveClasses(0);
  setLabel(0);
  buildDots();
  applyTheme(0);

  // Preload seulement les 2 prochaines images (pas tout d'un coup)
  function preloadNearby(index) {
    const d = discs();
    const isMobile = innerWidth <= 600;
    for (let offset = 0; offset <= 1; offset++) {
      const el = d[(index + offset) % d.length];
      const url = (isMobile && el?.dataset?.imageMobile) || el?.dataset?.image;
      if (url) preloadImages([url]);
    }
  }
  preloadNearby(0);

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

  /* ---------- Scroll Reveal ---------- */
  const revealElements = document.querySelectorAll(".reveal");
  if (revealElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    revealElements.forEach((el) => revealObserver.observe(el));
  }

  /* ---------- Scroll hint click → chatbot ---------- */
  const scrollHint = document.querySelector(".scroll-hint");
  if (scrollHint) {
    scrollHint.style.cursor = "pointer";
    scrollHint.addEventListener("click", () => {
      const chatSection = document.getElementById("chatbot-section");
      if (chatSection) chatSection.scrollIntoView({ behavior: "smooth", block: "start" });
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

  /* ---------- Stagger reveal pour grilles ---------- */
  const staggerGrids = document.querySelectorAll(".stats-grid, .process-grid, .contact-grid");
  if (staggerGrids.length > 0) {
    const staggerObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        gsap.fromTo(entry.target.children,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: "power2.out" }
        );
        staggerObserver.unobserve(entry.target);
      });
    }, { threshold: 0.2 });
    staggerGrids.forEach((el) => staggerObserver.observe(el));
  }

  /* ---------- About section reveal ---------- */
  const aboutSection = document.querySelector(".about-section");
  if (aboutSection) {
    const aboutObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        gsap.fromTo(aboutSection.querySelector(".about-container"),
          { opacity: 0, y: 30, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "power2.out" }
        );
        aboutObserver.disconnect();
      }
    }, { threshold: 0.2 });
    aboutObserver.observe(aboutSection);
  }

  /* ---------- Son ambiant + visualiseur + volume ---------- */
  const soundToggle = document.getElementById("sound-toggle");
  if (soundToggle) {
    let audio = null;
    let audioCtx = null;
    let analyser = null;
    let sourceNode = null;
    let soundOn = false;
    let vizRaf = 0;
    const iconOff = soundToggle.querySelector(".sound-icon--off");
    const iconOn = soundToggle.querySelector(".sound-icon--on");

    // Barres de visualisation
    const vizContainer = document.createElement("div");
    vizContainer.className = "sound-viz";
    const BARS = 12;
    for (let i = 0; i < BARS; i++) {
      const bar = document.createElement("span");
      bar.className = "sound-viz__bar";
      bar.style.setProperty("--i", i);
      vizContainer.appendChild(bar);
    }
    soundToggle.appendChild(vizContainer);

    // Slider de volume
    const volSlider = document.createElement("input");
    volSlider.type = "range";
    volSlider.min = "0";
    volSlider.max = "100";
    volSlider.value = "30";
    volSlider.className = "sound-volume";
    volSlider.setAttribute("aria-label", "Volume");
    soundToggle.parentElement.appendChild(volSlider);
    volSlider.style.display = "none";

    function initAudio() {
      if (audio) return;
      audio = new Audio();
      // M4A (AAC 64kbps, 935KB) avec fallback MP3
      const canM4a = audio.canPlayType("audio/mp4; codecs=mp4a.40.2");
      audio.src = canM4a ? "./audio/boheme-light.m4a" : "./audio/La Bohème - Charles Aznavour.mp3";
      audio.loop = true;
      audio.volume = volSlider.value / 100;
      audio.setAttribute("playsinline", "");
      audio.setAttribute("webkit-playsinline", "");
      // AudioContext + Analyser (cree dans le geste utilisateur pour iOS)
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        sourceNode = audioCtx.createMediaElementSource(audio);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        sourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);
      } catch {
        // Fallback : pas de visualiseur, mais le son marche
        analyser = null;
      }
    }

    const barEls = vizContainer.querySelectorAll(".sound-viz__bar");

    function vizLoop() {
      if (!soundOn) return;
      if (analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        for (let i = 0; i < BARS; i++) {
          const val = data[Math.floor(i * data.length / BARS)] / 255;
          barEls[i].style.transform = `rotate(${i * 30}deg) scaleY(${0.3 + val * 1.2})`;
          barEls[i].style.opacity = 0.3 + val * 0.7;
        }
      } else {
        // Fallback sans analyser : animation simple basee sur le temps
        const t = Date.now() * 0.003;
        for (let i = 0; i < BARS; i++) {
          const val = 0.3 + Math.abs(Math.sin(t + i * 0.5)) * 0.7;
          barEls[i].style.transform = `rotate(${i * 30}deg) scaleY(${val})`;
          barEls[i].style.opacity = 0.3 + val * 0.4;
        }
      }
      vizRaf = requestAnimationFrame(vizLoop);
    }

    soundToggle.addEventListener("click", () => {
      initAudio();
      if (!audio) return;
      soundOn = !soundOn;
      if (soundOn) {
        // Resume AudioContext (obligatoire iOS/Safari apres geste)
        if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
        audio.currentTime = 0;
        audio.play().catch(() => { soundOn = false; });
        volSlider.style.display = "block";
        vizLoop();
      } else {
        audio.pause();
        audio.currentTime = 0;
        cancelAnimationFrame(vizRaf);
        volSlider.style.display = "none";
        barEls.forEach((b, i) => {
          b.style.transform = `rotate(${i * 30}deg) scaleY(0.3)`;
          b.style.opacity = "0";
        });
      }
      soundToggle.setAttribute("aria-pressed", String(soundOn));
      iconOff.style.display = soundOn ? "none" : "block";
      iconOn.style.display = soundOn ? "block" : "none";
    });

    volSlider.addEventListener("input", () => {
      if (audio) audio.volume = volSlider.value / 100;
    });
  }

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
