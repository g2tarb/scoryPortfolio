/**
 * SCORY — app.js
 * Navigation flèches + transitions particules, long press détails, chatbot devis.
 */
import gsap from "gsap";
import { FlaynnNeuralBackground } from "./three-neural.js";
import { WaterReflectionLayer } from "./three-water.js";
import { ParticleTransition } from "./particles.js";

const EASE_SPRING_HEAVY = "back.out(1.32)";

/** Projets : titre, desc courte, détails (long press) */
const PROJECTS = [
  {
    title: "4dayvelopment",
    desc: "Projet web — développement et mise en scène de l'expérience.",
    detail: "4Dayvelopment livre des écosystèmes digitaux complets (branding, site, automations, funnel de conversion) en 4 jours ouvrés. Stack : Astro, Node.js, n8n, GSAP. Livré ou c'est gratuit.",
  },
  {
    title: "Clara Martinez",
    desc: "Direction artistique et identité visuelle — univers soigné, narration claire.",
    detail: "Identité visuelle complète pour Clara Martinez : logo, charte graphique, site vitrine responsive. Approche minimaliste avec des accents dorés sur fond sombre.",
  },
  {
    title: "Flaynn",
    desc: "Expérience digitale immersive — interface, motion et ambiance Flaynn.",
    detail: "Flaynn est une plateforme SaaS de scoring et matching pour startups et investisseurs. Scoring IA via Claude API, génération de fiches PDF, pipeline n8n automatisé.",
  },
  {
    title: "Portfolio Scory",
    desc: "Ce musée digital — le portfolio que vous explorez en ce moment.",
    detail: "Portfolio conçu comme un musée interactif : fond neural Three.js, reflets eau via shader GLSL, carrousel à disques vinyle, animations GSAP spring. 100% vanilla JS.",
  },
];

/**
 * Thèmes visuels par projet — couleurs, polices, filtre neural.
 * Extraits des vrais projets Clara Martinez, 4dayvelopment et Flaynn.
 */
const THEMES = [
  // 0 — 4dayvelopment
  {
    gold: "#DA5426",
    amber: "#f2b13b",
    ice: "#884083",
    magenta: "#DA5426",
    glow: "rgba(218,84,38,0.12)",
    glowStrong: "rgba(218,84,38,0.25)",
    glowDisc: "rgba(218,84,38,0.15)",
    fontDisplay: "'Syne', system-ui, sans-serif",
    fontSans: "'Inter', system-ui, sans-serif",
    neuralFilter: "hue-rotate(-25deg) saturate(1.3) brightness(1.1)",
    particleColors: [[218,84,38],[242,177,59],[136,64,131],[240,240,240],[255,160,80]],
  },
  // 1 — Clara Martinez
  {
    gold: "#C9A84C",
    amber: "#E8D49A",
    ice: "#C9A84C",
    magenta: "#A8863A",
    glow: "rgba(201,168,76,0.12)",
    glowStrong: "rgba(201,168,76,0.25)",
    glowDisc: "rgba(201,168,76,0.18)",
    fontDisplay: "'Playfair Display', 'Times New Roman', serif",
    fontSans: "'Inter', system-ui, sans-serif",
    neuralFilter: "hue-rotate(5deg) saturate(0.85) brightness(0.95)",
    particleColors: [[201,168,76],[232,212,154],[168,134,58],[245,240,232],[180,155,90]],
  },
  // 2 — Flaynn
  {
    gold: "#7B2D8E",
    amber: "#C13584",
    ice: "#10b981",
    magenta: "#C13584",
    glow: "rgba(123,45,142,0.12)",
    glowStrong: "rgba(123,45,142,0.25)",
    glowDisc: "rgba(123,45,142,0.18)",
    fontDisplay: "'IBM Plex Sans', system-ui, sans-serif",
    fontSans: "'IBM Plex Sans', system-ui, sans-serif",
    neuralFilter: "hue-rotate(75deg) saturate(1.4) brightness(1.05)",
    particleColors: [[123,45,142],[193,53,132],[16,185,129],[240,240,243],[59,130,246]],
  },
  // 3 — Portfolio Scory (défaut)
  {
    gold: "#c9a962",
    amber: "#e8b86d",
    ice: "#9ec8ff",
    magenta: "#c084fc",
    glow: "rgba(201,169,98,0.12)",
    glowStrong: "rgba(201,169,98,0.25)",
    glowDisc: "rgba(201,169,98,0.12)",
    fontDisplay: "'Cormorant Garamond', 'Times New Roman', serif",
    fontSans: "'DM Sans', system-ui, sans-serif",
    neuralFilter: "none",
    particleColors: [[201,169,98],[158,200,255],[192,132,252],[232,184,109],[245,242,255]],
  },
];

/** Chatbot : 10 questions, 7-8 choix, calcul de prix */
const CHAT_FLOW = [
  {
    id: "q1",
    bot: "Bienvenue ! 👋 Pour commencer, quel type de projet avez-vous en tête ?",
    options: [
      { label: "Site vitrine", next: "q2", cost: 800 },
      { label: "Landing page", next: "q2", cost: 500 },
      { label: "E-commerce", next: "q2", cost: 3000 },
      { label: "SaaS / App web", next: "q2", cost: 5000 },
      { label: "Portfolio créatif", next: "q2", cost: 1200 },
      { label: "Blog / Média", next: "q2", cost: 1000 },
      { label: "Application mobile", next: "q2", cost: 6000 },
      { label: "Projet sur-mesure", next: "q2", cost: 4000 },
    ],
  },
  {
    id: "q2",
    bot: "Excellent choix ! Que voulez-vous qu'on ressente en regardant votre site ?",
    options: [
      { label: "Luxe & Premium", next: "q3", cost: 800 },
      { label: "Moderne & High-Tech", next: "q3", cost: 500 },
      { label: "Chaleureux & Authentique", next: "q3", cost: 300 },
      { label: "Minimaliste & Épuré", next: "q3", cost: 200 },
      { label: "Créatif & Artistique", next: "q3", cost: 700 },
      { label: "Corporate & Sérieux", next: "q3", cost: 300 },
      { label: "Fun & Dynamique", next: "q3", cost: 500 },
      { label: "Nature & Éco-responsable", next: "q3", cost: 350 },
    ],
  },
  {
    id: "q3",
    bot: "Très bien ! Combien de pages souhaitez-vous pour votre site ?",
    options: [
      { label: "One page", next: "q4", cost: 0 },
      { label: "2–3 pages", next: "q4", cost: 200 },
      { label: "4–6 pages", next: "q4", cost: 500 },
      { label: "7–10 pages", next: "q4", cost: 900 },
      { label: "11–20 pages", next: "q4", cost: 1500 },
      { label: "20+ pages", next: "q4", cost: 2500 },
      { label: "Je ne sais pas encore", next: "q4", cost: 500 },
    ],
  },
  {
    id: "q4",
    bot: "Et côté design, quel niveau attendez-vous ?",
    options: [
      { label: "Template adapté", next: "q5", cost: 0 },
      { label: "Semi-personnalisé", next: "q5", cost: 500 },
      { label: "Design 100% sur-mesure", next: "q5", cost: 1500 },
      { label: "Direction artistique complète", next: "q5", cost: 2200 },
      { label: "Motion design intégré", next: "q5", cost: 1800 },
      { label: "3D / Expérience immersive", next: "q5", cost: 2800 },
      { label: "J'ai déjà une maquette", next: "q5", cost: 100 },
      { label: "Je ne sais pas", next: "q5", cost: 600 },
    ],
  },
  {
    id: "q5",
    bot: "Quelle fonctionnalité est la plus importante pour vous ?",
    options: [
      { label: "Formulaire de contact", next: "q6", cost: 100 },
      { label: "Blog intégré", next: "q6", cost: 400 },
      { label: "Paiement en ligne", next: "q6", cost: 800 },
      { label: "Espace membre / Login", next: "q6", cost: 1000 },
      { label: "Réservation / Calendrier", next: "q6", cost: 700 },
      { label: "Chat en direct", next: "q6", cost: 500 },
      { label: "Dashboard / Back-office", next: "q6", cost: 1200 },
      { label: "Multi-langue", next: "q6", cost: 600 },
    ],
  },
  {
    id: "q6",
    bot: "Pour le contenu du site, qui s'en charge ?",
    options: [
      { label: "Je fournis tout", next: "q7", cost: 0 },
      { label: "Rédaction des textes incluse", next: "q7", cost: 500 },
      { label: "Shooting photo pro", next: "q7", cost: 600 },
      { label: "Vidéo / Motion incluse", next: "q7", cost: 900 },
      { label: "Illustrations sur-mesure", next: "q7", cost: 700 },
      { label: "Optimisation SEO incluse", next: "q7", cost: 400 },
      { label: "Je ne sais pas encore", next: "q7", cost: 300 },
    ],
  },
  {
    id: "q7",
    bot: "Parlons animations ! Quel niveau souhaitez-vous ?",
    options: [
      { label: "Aucune, sobre et efficace", next: "q8", cost: 0 },
      { label: "Subtiles (hover, fades)", next: "q8", cost: 200 },
      { label: "Modérées (scroll, parallax)", next: "q8", cost: 500 },
      { label: "Avancées (GSAP, timelines)", next: "q8", cost: 1000 },
      { label: "Immersives (Three.js, WebGL)", next: "q8", cost: 2200 },
      { label: "Micro-interactions poussées", next: "q8", cost: 700 },
      { label: "Curseur personnalisé", next: "q8", cost: 300 },
      { label: "Maximum de wow-effect !", next: "q8", cost: 1500 },
    ],
  },
  {
    id: "q8",
    bot: "Sur quels appareils votre site doit-il être parfait ?",
    options: [
      { label: "Desktop uniquement", next: "q9", cost: 0 },
      { label: "Mobile first", next: "q9", cost: 200 },
      { label: "Responsive classique", next: "q9", cost: 300 },
      { label: "Tablette aussi", next: "q9", cost: 400 },
      { label: "PWA (installable)", next: "q9", cost: 800 },
      { label: "App native en plus", next: "q9", cost: 3000 },
      { label: "Tous les écrans", next: "q9", cost: 500 },
    ],
  },
  {
    id: "q9",
    bot: "Quel suivi souhaitez-vous après la livraison ?",
    options: [
      { label: "Aucun, je gère seul", next: "q10", cost: 0 },
      { label: "Corrections ponctuelles", next: "q10", cost: 150 },
      { label: "Mises à jour mensuelles", next: "q10", cost: 350 },
      { label: "Support prioritaire 7j/7", next: "q10", cost: 600 },
      { label: "Formation à l'outil", next: "q10", cost: 400 },
      { label: "Hébergement & domaine inclus", next: "q10", cost: 250 },
      { label: "Analytics & rapports", next: "q10", cost: 400 },
      { label: "Pack tout inclus", next: "q10", cost: 900 },
    ],
  },
  {
    id: "q10",
    bot: "Dernière question ! Quel est votre délai idéal ?",
    options: [
      { label: "Hier (urgence absolue) 🔥", next: "contact", multiplier: 1.5 },
      { label: "Moins d'une semaine", next: "contact", multiplier: 1.4 },
      { label: "2 semaines", next: "contact", multiplier: 1.2 },
      { label: "1 mois", next: "contact", multiplier: 1.0 },
      { label: "2–3 mois", next: "contact", multiplier: 0.95 },
      { label: "Pas pressé du tout", next: "contact", multiplier: 0.9 },
      { label: "À définir ensemble", next: "contact", multiplier: 1.0 },
      { label: "Flexible", next: "contact", multiplier: 0.95 },
    ],
  },
  {
    id: "contact",
    bot: "Parfait ! Laissez-moi votre email pour recevoir votre devis personnalisé :",
    freeText: true,
    next: "done",
  },
  {
    id: "done",
    bot: "",
    options: [],
  },
];

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function main() {
  const stage = document.getElementById("museum-stage");
  const neuralHost = document.getElementById("neural-host");
  const waterHost = document.getElementById("water-host");
  const carousel = document.getElementById("project-carousel");
  const track = document.getElementById("project-track");
  const labelTitle = document.getElementById("label-title");
  const labelDesc = document.getElementById("label-desc");
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

  /* ---------- Three.js ---------- */
  const neural = new FlaynnNeuralBackground(neuralHost, { timeScale: reduced ? 0.22 : 1 });

  // Masquer le loader après initialisation Three.js
  requestAnimationFrame(() => {
    setTimeout(() => {
      if (loader) loader.classList.add("is-hidden");
    }, 800);
  });

  let water = null;
  let waterSplashTween = null;
  if (waterHost) {
    water = new WaterReflectionLayer(waterHost, { timeScale: reduced ? 0.22 : 1 });
    gsap.set(waterHost, { opacity: 0 });
  }
  gsap.set(neuralHost, { opacity: 1 });

  /* ---------- Particules ---------- */
  const particles = new ParticleTransition(particleCanvas);

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
    // Mettre à jour les couleurs des particules
    particles.setColors(t.particleColors);
  }

  /* ---------- État ---------- */
  let activeIndex = 0;
  let animating = false;
  let longPressTimer = null;
  let detailVisible = false;

  const discs = () => [...track.querySelectorAll(".project-disc")];

  /* ---------- Dots ---------- */
  function buildDots() {
    dotsContainer.innerHTML = "";
    discs().forEach((_, i) => {
      const dot = document.createElement("button");
      dot.className = "nav-dot" + (i === activeIndex ? " is-active" : "");
      dot.setAttribute("aria-label", `Projet ${i + 1}`);
      dot.addEventListener("click", () => goTo(i));
      dotsContainer.appendChild(dot);
    });
  }

  function updateDots() {
    dotsContainer.querySelectorAll(".nav-dot").forEach((d, i) =>
      d.classList.toggle("is-active", i === activeIndex)
    );
  }

  /* ---------- Label / cartel ---------- */
  function setLabel(i, animate) {
    const p = PROJECTS[i];
    if (!p) return;
    if (!animate || reduced) {
      labelTitle.textContent = p.title;
      labelDesc.textContent = p.desc;
      return;
    }
    gsap.to([labelTitle, labelDesc], {
      opacity: 0, y: -6, duration: 0.2, ease: "power2.in",
      onComplete: () => {
        labelTitle.textContent = p.title;
        labelDesc.textContent = p.desc;
        gsap.fromTo([labelTitle, labelDesc],
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.3, ease: "power2.out", stagger: 0.06 }
        );
      },
    });
  }

  function setActiveClasses(i) {
    discs().forEach((d, idx) => {
      d.classList.toggle("is-active", idx === i);
      d.setAttribute("aria-current", idx === i ? "true" : "false");
    });
  }

  /* ---------- Fond eau / neural pour Scory ---------- */
  async function syncProjectWater() {
    if (!water || !waterHost) return;

    // Disque Scory (index 3) → fond neural Three.js seul, pas d'image
    if (activeIndex === 3) {
      if (waterSplashTween) waterSplashTween.kill();
      gsap.to(neuralHost, { opacity: 1, duration: 0.8, ease: "power2.out" });
      gsap.to(waterHost, { opacity: 0, duration: 0.8, ease: "power2.out" });
      return;
    }

    const el = discs()[activeIndex];
    const url = el?.dataset?.image;
    if (!url) return;
    try { await water.loadTexture(url); } catch { return; }
    runWaterSplash();
  }

  function runWaterSplash() {
    if (!water || !waterHost) return;
    if (waterSplashTween) waterSplashTween.kill();
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

    // Position du disque pour les particules
    const rect = currentDisc.getBoundingClientRect();

    // Masquer le disque courant
    gsap.set(currentDisc, { opacity: 0, pointerEvents: "none" });

    // Transition shader neural
    const tProxy = { p: 0 };
    gsap.to(tProxy, {
      p: 1, duration: 1.2, ease: "power2.inOut",
      onUpdate: () => neural.setTransitionProgress(tProxy.p),
      onComplete: () => neural.setTransitionProgress(0),
    });

    // Transition particules
    await particles.transition(rect, direction);

    // Nettoyer les styles inline du disque précédent
    gsap.set(currentDisc, { clearProps: "opacity,pointerEvents,scale,transform" });

    // Mettre à jour l'état
    activeIndex = nextIndex;
    setActiveClasses(activeIndex);
    setLabel(activeIndex, true);
    updateDots();
    applyTheme(activeIndex);

    // Faire apparaître le nouveau disque
    const nextDisc = d[activeIndex];
    gsap.fromTo(nextDisc,
      { opacity: 0, scale: 0.9 },
      {
        opacity: 1, scale: 1, duration: 0.35, ease: EASE_SPRING_HEAVY,
        onComplete: () => gsap.set(nextDisc, { clearProps: "opacity,scale,transform" }),
      }
    );

    animating = false;
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

  /* ---------- Long press → panneau détails ---------- */
  function openDetail() {
    if (detailVisible) return;
    detailVisible = true;
    const p = PROJECTS[activeIndex];
    if (!p) return;
    detailTitle.textContent = p.title;
    detailText.textContent = p.detail;
    detailPanel.classList.add("is-visible");
    detailPanel.setAttribute("aria-hidden", "false");
    const finish = () => {
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      closeDetail();
    };
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  }

  function closeDetail() {
    if (!detailVisible) return;
    detailVisible = false;
    detailPanel.classList.remove("is-visible");
    detailPanel.setAttribute("aria-hidden", "true");
  }

  let longPressArmed = true;
  let dragStartX = 0;

  carousel.addEventListener("pointerdown", (e) => {
    if (animating || detailVisible) return;
    dragStartX = e.clientX;
    longPressArmed = true;
    const target = e.target.closest(".project-disc");
    if (target && target.classList.contains("is-active")) {
      longPressTimer = window.setTimeout(() => {
        if (longPressArmed) openDetail();
      }, 500);
    }
  });

  carousel.addEventListener("pointermove", (e) => {
    if (Math.abs(e.clientX - dragStartX) > 12) {
      longPressArmed = false;
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    }
  });

  carousel.addEventListener("pointerup", () => {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  });

  /* ---------- Swipe tactile ---------- */
  let swipeStartX = 0;
  carousel.addEventListener("touchstart", (e) => {
    swipeStartX = e.touches[0].clientX;
  }, { passive: true });
  carousel.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - swipeStartX;
    if (Math.abs(dx) > 60 && !animating) {
      if (dx < 0) goTo(activeIndex + 1);
      else goTo(activeIndex - 1);
    }
  });

  /* ---------- Resize ---------- */
  window.addEventListener("resize", () => {
    neural.resize();
    if (water) water.resize();
    particles.resize();
  }, { passive: true });

  /* ---------- Init ---------- */
  setActiveClasses(0);
  setLabel(0);
  buildDots();
  applyTheme(0);
  void syncProjectWater();

  if (reduced) {
    neural.setRotationInfluence(0);
    neural.setTransitionProgress(0);
  }

  /* =================================================================
     CHATBOT — 10 questions, calcul de prix théorique
     ================================================================= */
  const chatMessages = document.getElementById("chatbot-messages");
  const chatPills = document.getElementById("chatbot-pills");
  const chatTyping = document.getElementById("chatbot-typing");
  const chatData = { baseCost: 0, multiplier: 1, answers: {} };

  function getStep(id) { return CHAT_FLOW.find((s) => s.id === id); }

  function addBotMessage(text) {
    const div = document.createElement("div");
    div.className = "chat-msg chat-msg--bot";
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function addUserMessage(text) {
    const div = document.createElement("div");
    div.className = "chat-msg chat-msg--user";
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function showTyping() { chatTyping.style.display = "flex"; }
  function hideTyping() { chatTyping.style.display = "none"; }

  function formatPrice(n) {
    return Math.round(n).toLocaleString("fr-FR");
  }

  function renderStep(stepId) {
    const step = getStep(stepId);
    if (!step) return;

    chatPills.innerHTML = "";
    showTyping();

    // Indicateur de progression
    const chatStatus = document.querySelector(".chatbot-status");
    const qNum = stepId.startsWith("q") ? parseInt(stepId.slice(1)) : null;
    if (qNum) chatStatus.textContent = `${qNum} / 10`;
    else if (stepId === "contact") chatStatus.textContent = "Presque fini !";
    else if (stepId === "done") chatStatus.textContent = "Devis prêt ✓";

    setTimeout(() => {
      hideTyping();

      // Message dynamique pour le résultat final
      let botText = step.bot;
      if (stepId === "done") {
        const total = Math.round(chatData.baseCost * chatData.multiplier);
        const low = Math.round(total * 0.85);
        const high = Math.round(total * 1.15);
        botText = `Merci ! 🎯 D'après vos réponses, votre projet est estimé entre ${formatPrice(low)}€ et ${formatPrice(high)}€ TTC. Scory vous recontacte sous 24h avec un devis détaillé. À bientôt !`;
      }

      addBotMessage(botText);

      if (step.options && step.options.length > 0) {
        step.options.forEach((opt) => {
          const btn = document.createElement("button");
          btn.className = "chat-pill";
          btn.textContent = opt.label;
          btn.addEventListener("click", () => {
            if (typeof opt.cost === "number") chatData.baseCost += opt.cost;
            if (typeof opt.multiplier === "number") chatData.multiplier = opt.multiplier;
            chatData.answers[stepId] = opt.label;
            addUserMessage(opt.label);
            chatPills.innerHTML = "";
            renderStep(opt.next);
          });
          chatPills.appendChild(btn);
        });
      } else if (step.freeText) {
        const input = document.createElement("input");
        input.type = stepId === "contact" ? "email" : "text";
        input.placeholder = stepId === "contact" ? "votre@email.com" : "Tapez ici…";
        input.className = "chat-input";
        const send = document.createElement("button");
        send.className = "chat-pill";
        send.textContent = "Envoyer";
        const submit = () => {
          const val = input.value.trim();
          if (!val) return;
          chatData.answers[stepId] = val;
          addUserMessage(val);
          chatPills.innerHTML = "";
          renderStep(step.next);
        };
        send.addEventListener("click", submit);
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
        chatPills.appendChild(input);
        chatPills.appendChild(send);
        input.focus();
      }

      // Bouton recommencer après le devis
      if (stepId === "done") {
        const restart = document.createElement("button");
        restart.className = "chat-pill";
        restart.textContent = "↻ Recommencer";
        restart.addEventListener("click", () => {
          chatMessages.innerHTML = "";
          chatData.baseCost = 0;
          chatData.multiplier = 1;
          chatData.answers = {};
          chatPills.innerHTML = "";
          document.querySelector(".chatbot-status").textContent = "En ligne";
          renderStep("q1");
        });
        chatPills.appendChild(restart);
      }
    }, 700 + Math.random() * 500);
  }

  // Lancer le chatbot quand il est visible
  const chatObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      chatObserver.disconnect();
      renderStep("q1");
    }
  }, { threshold: 0.3 });
  chatObserver.observe(document.getElementById("chatbot-section"));
}

main();
