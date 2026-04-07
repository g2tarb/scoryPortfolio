/**
 * SCORY — app.js
 * Navigation flèches + transitions particules, long press détails, chatbot devis.
 */
import gsap from "gsap";
import { FlaynnNeuralBackground } from "./three-neural.js";
import { WaterReflectionLayer } from "./three-water.js";
import { ParticleTransition } from "./particles.js";
// universe.js, aurora.js, nebula-flaynn.js : chargés à la demande (dynamic import)

const EASE_SPRING_HEAVY = "back.out(1.32)";

/** Preload des images pour des transitions plus fluides */
function preloadImages(urls) {
  urls.forEach((url) => {
    if (!url) return;
    const img = new Image();
    img.src = url;
  });
}

/** Projets : titre, desc courte, détails (long press), URL de visite */
const PROJECTS = [
  {
    title: "Portfolio Scory",
    desc: "Ce musée digital — le portfolio que vous explorez en ce moment.",
    detail: "Portfolio conçu comme un musée interactif : fond neural Three.js procédural, reflets eau via shader GLSL, carrousel à disques vinyle avec transitions particules, thèmes dynamiques par projet, chatbot devis intégré. 100 % vanilla JS, zéro framework.",
    stack: ["Three.js", "GLSL", "GSAP", "Vanilla JS"],
    url: null,
    screenshots: [],
  },
  {
    title: "4dayvelopment",
    desc: "Agence web — ecosystemes digitaux complets sur-mesure.",
    detail: "4Dayvelopment conçoit des écosystèmes digitaux complets : branding, site sur-mesure, automations n8n, funnel de conversion. Design dark luxury avec curseur magnétique, animations Three.js, mode sombre/clair, formulaire intelligent avec devis instantané. 17+ projets livrés, 100 % satisfaction.",
    stack: ["Node.js", "Express", "Three.js", "GSAP", "n8n", "Zod"],
    url: "https://4dayvelopment.fr/",
    screenshots: ["./image/fond4Day.jpg", "./image/4dayMobile.jpg"],
  },
  {
    title: "Clara Martinez",
    desc: "Coaching premium — transformer les freelances en entrepreneurs structurés.",
    detail: "Site vitrine haut de gamme pour Clara Martinez, coach business à Paris. Méthodologie « Clarity » en 12 semaines. Design dark luxe avec aurora borealis interactive en Canvas, glassmorphism, bento grid, curseur magnétique. Formulaire de contact, FAQ accordion, témoignages, timeline du programme.",
    stack: ["HTML5", "Canvas API", "Vanilla JS", "Lucide Icons", "Aurora BG"],
    url: "https://clara-martinez-project.vercel.app/",
    screenshots: ["./image/fondClara.jpg", "./image/claramartinezMobile.jpg"],
  },
  {
    title: "Flaynn",
    desc: "SaaS B2B — scoring objectif et matching startups-investisseurs.",
    detail: "Flaynn audite les startups sur 5 piliers (Marché, Produit, Traction, Équipe, Exécution) et génère un score investor-grade en 24h. Design « Dark Clarity » inspiré de Linear et Vercel. Dashboard SPA avec graphes réseau, formulaire multi-étapes, authentification JWT, scoring IA via Claude API, pipeline n8n automatisé.",
    stack: ["Fastify 5", "PostgreSQL", "Three.js", "GSAP", "JWT", "Claude API"],
    url: "https://flaynn.tech/",
    screenshots: ["./image/fondFlaynn.jpg", "./image/flaynnMobile.jpg"],
  },
];

/** Convertit hex → rgba */
function hexToRgba(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Thèmes visuels par projet — couleurs, polices, filtre neural.
 * Extraits des vrais projets Clara Martinez, 4dayvelopment et Flaynn.
 */
const THEMES = [
  // 0 — Portfolio Scory (défaut, premier disque)
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
  // 1 — 4dayvelopment (Three.js réseau orange/chaud)
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
    neuralFilter: "hue-rotate(-30deg) saturate(1.8) brightness(1.15) contrast(1.1)",
    particleColors: [[218,84,38],[242,177,59],[136,64,131],[240,240,240],[255,160,80]],
  },
  // 2 — Clara Martinez (aurore boréale dorée/verte)
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
    neuralFilter: "hue-rotate(85deg) saturate(1.6) brightness(1.2) contrast(1.05)",
    particleColors: [[201,168,76],[232,212,154],[168,134,58],[245,240,232],[180,155,90]],
  },
  // 3 — Flaynn (réseau violet/néon)
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
    neuralFilter: "hue-rotate(60deg) saturate(2) brightness(1.1) contrast(1.15)",
    particleColors: [[123,45,142],[193,53,132],[16,185,129],[240,240,243],[59,130,246]],
  },
];

/** Chatbot : prénom + note + 10 questions + contact + devis */
const CHAT_FLOW = [
  {
    id: "name",
    bot: "Bienvenue dans l'univers Scory ! 👋 Comment vous appelez-vous ?",
    freeText: true,
    placeholder: "Votre prénom...",
    next: "rate",
  },
  {
    id: "rate",
    bot: "",
    botTemplate: "Enchanté {name} ! Avant de commencer, que pensez-vous de ce portfolio ? Notez-le !",
    options: [
      { label: "⭐ 1 — Bof", next: "q1" },
      { label: "⭐⭐ 2 — Correct", next: "q1" },
      { label: "⭐⭐⭐ 3 — Bien", next: "q1" },
      { label: "⭐⭐⭐⭐ 4 — Très bien", next: "q1" },
      { label: "⭐⭐⭐⭐⭐ 5 — Incroyable !", next: "q1" },
    ],
  },
  {
    id: "q1",
    bot: "",
    botTemplate: "Merci {name} ! Passons à votre projet. Quel type de site avez-vous en tête ?",
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
    bot: "Très bien ! Combien de pages souhaitez-vous ?",
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
      { label: "Design 100 % sur-mesure", next: "q5", cost: 1500 },
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
    bot: "",
    botTemplate: "Parfait {name} ! Laissez-moi votre email pour recevoir votre devis personnalisé :",
    freeText: true,
    placeholder: "votre@email.com",
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

  /* ---------- Three.js ---------- */
  const neural = new FlaynnNeuralBackground(neuralHost, { timeScale: reduced ? 0.22 : 1 });

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

  // Masquer le loader + animation d'entree sequentielle
  requestAnimationFrame(() => {
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
    }, 2200);
  });

  let water = null;
  let waterSplashTween = null;
  let waterFadeTimer = null;
  // Water renderer créé au premier besoin (pas au chargement)
  function ensureWater() {
    if (!water && waterHost) {
      water = new WaterReflectionLayer(waterHost, { timeScale: reduced ? 0.22 : 1 });
    }
  }
  if (waterHost) gsap.set(waterHost, { opacity: 0 });
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
    // Couleurs chatbot (calculées depuis les hex)
    s.setProperty("--theme-tint-a", hexToRgba(t.magenta, 0.08));
    s.setProperty("--theme-tint-b", hexToRgba(t.magenta, 0.18));
    s.setProperty("--theme-tint-c", hexToRgba(t.magenta, 0.3));
    s.setProperty("--theme-tint-d", hexToRgba(t.magenta, 0.55));
    s.setProperty("--theme-warm-a", hexToRgba(t.amber, 0.1));
    s.setProperty("--theme-warm-b", hexToRgba(t.amber, 0.2));
    s.setProperty("--theme-warm-c", hexToRgba(t.amber, 0.25));
    // Mettre à jour les couleurs des particules
    particles.setColors(t.particleColors);
  }

  /* ---------- État ---------- */
  let activeIndex = 0;
  let animating = false;
  let detailVisible = false;

  const discs = () => [...track.querySelectorAll(".project-disc")];

  /* ---------- Dots ---------- */
  function buildDots() {
    dotsContainer.innerHTML = "";
    discs().forEach((_, i) => {
      const dot = document.createElement("button");
      dot.className = "nav-dot" + (i === activeIndex ? " is-active" : "");
      dot.setAttribute("aria-label", `Projet ${i + 1} : ${PROJECTS[i]?.title || ""}`);
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-selected", i === activeIndex ? "true" : "false");
      dot.addEventListener("click", () => goTo(i));
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
    const p = PROJECTS[i];
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
      d.classList.toggle("is-active", idx === i);
      d.setAttribute("aria-current", idx === i ? "true" : "false");
    });
  }

  /* ---------- Fond eau / neural / projet ---------- */
  async function syncProjectWater() {
    if (!waterHost) return;
    ensureWater();
    if (!water) return;

    // Annuler tout timer de crossfade précédent
    if (waterFadeTimer) { clearTimeout(waterFadeTimer); waterFadeTimer = null; }
    hideProjectBg();

    // Disque Scory (index 0) → fond neural Three.js seul, pas d'image
    if (activeIndex === 0) {
      if (waterSplashTween) waterSplashTween.kill();
      gsap.to(neuralHost, { opacity: 1, duration: 0.8, ease: "power2.out" });
      gsap.to(waterHost, { opacity: 0, duration: 0.8, ease: "power2.out" });
      return;
    }

    const el = discs()[activeIndex];
    const isMobile = window.innerWidth <= 600;
    const url = (isMobile && el?.dataset?.imageMobile) || el?.dataset?.image;
    if (!url) return;
    try { await water.loadTexture(url); } catch { return; }
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
    waterFadeTimer = setTimeout(() => {
      gsap.to(waterHost, { opacity: 0, duration: 2, ease: "power2.inOut" });
      gsap.to(neuralHost, { opacity: 0, duration: 2, ease: "power2.inOut" });
      showProjectBg(activeIndex);
    }, 5000);
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
    const p = PROJECTS[activeIndex];
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
      cta.addEventListener("click", (e) => e.stopPropagation());
      detailCtaWrap.appendChild(cta);
    }
    detailPanel.classList.add("is-visible");
    detailPanel.setAttribute("aria-hidden", "false");
    // Fermer au clic en dehors du panneau — utilise click (pas pointerup)
    // pour ne pas fermer immédiatement au relâchement du long press
    _closeOnOutsideRef = (e) => {
      if (!detailPanel.contains(e.target)) {
        closeDetail();
      }
    };
    // Attendre que le long press soit fini (le prochain clic fermera)
    setTimeout(() => {
      document.addEventListener("click", _closeOnOutsideRef, true);
    }, 600);
  }

  let _closeOnOutsideRef = null;
  function closeDetail() {
    if (!detailVisible) return;
    detailVisible = false;
    detailPanel.classList.remove("is-visible");
    detailPanel.setAttribute("aria-hidden", "true");
    if (_closeOnOutsideRef) {
      document.removeEventListener("click", _closeOnOutsideRef, true);
      _closeOnOutsideRef = null;
    }
  }

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
    const isSwipe = (Math.abs(dx) > 40 && velocity > 0.3) || Math.abs(dx) > 60;
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
    }, 100);
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
      if (now - lastCursorFrame < 16) return;
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

  // Rotation lente continue du disque actif
  let discSpinAngle = 0;
  let discSpinActive = true;
  let discSpinRaf;
  function spinDisc() {
    if (!discSpinActive) return;
    discSpinAngle += 0.06; // ~6°/s → tour complet en ~60s
    const disc = discs().find((d) => d.classList.contains("is-active"));
    if (disc && !animating) {
      disc.style.transform = `rotate(${discSpinAngle}deg)`;
    }
    discSpinRaf = requestAnimationFrame(spinDisc);
  }
  if (!reduced) spinDisc();

  // Tilt 3D au survol (pause la rotation, ajoute le tilt)
  if (!isTouchDevice && !reduced) {
    carousel.addEventListener("mouseenter", () => {
      discSpinActive = false;
      cancelAnimationFrame(discSpinRaf);
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
          onComplete: () => {
            discSpinActive = true;
            spinDisc();
          },
        });
      } else {
        discSpinActive = true;
        spinDisc();
      }
    });
  }

  /* ---------- Init ---------- */
  setActiveClasses(0);
  setLabel(0);
  buildDots();
  applyTheme(0);
  void syncProjectWater();

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

  /* ---------- Pause Three.js hors ecran ---------- */
  const stageVisibility = new IntersectionObserver((entries) => {
    const visible = entries[0].isIntersecting;
    if (!visible) {
      // Pause les renderers quand le hero n'est plus visible
      if (discSpinActive) { discSpinActive = false; cancelAnimationFrame(discSpinRaf); }
      if (activeProjectBg) activeProjectBg.stop();
    } else {
      if (!reduced && !animating) { discSpinActive = true; spinDisc(); }
      if (activeProjectBg) activeProjectBg.start();
    }
  }, { threshold: 0.05 });
  stageVisibility.observe(stage);

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

  /* ---------- Son ambiant ---------- */
  const soundToggle = document.getElementById("sound-toggle");
  if (soundToggle) {
    let audioCtx, gainNode, audioBuffer, audioSource, soundOn = false;
    const iconOff = soundToggle.querySelector(".sound-icon--off");
    const iconOn = soundToggle.querySelector(".sound-icon--on");

    async function initAudio() {
      if (audioCtx) return;
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioCtx.createGain();
        gainNode.gain.value = 0;
        gainNode.connect(audioCtx.destination);
        // Générer un drone ambiant synthétique (pas besoin de fichier mp3)
        const sampleRate = audioCtx.sampleRate;
        const duration = 4;
        const length = sampleRate * duration;
        audioBuffer = audioCtx.createBuffer(2, length, sampleRate);
        for (let ch = 0; ch < 2; ch++) {
          const data = audioBuffer.getChannelData(ch);
          for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            // Drone doux : 3 harmoniques basses + bruit filtré
            data[i] = (
              Math.sin(t * 55 * Math.PI * 2) * 0.15 +
              Math.sin(t * 82.5 * Math.PI * 2) * 0.08 +
              Math.sin(t * 110 * Math.PI * 2) * 0.05 +
              (Math.random() - 0.5) * 0.02
            ) * (0.5 + 0.5 * Math.sin(t * 0.5 * Math.PI * 2));
          }
        }
        startSource();
      } catch { /* WebAudio non disponible */ }
    }

    function startSource() {
      if (!audioCtx || !audioBuffer) return;
      audioSource = audioCtx.createBufferSource();
      audioSource.buffer = audioBuffer;
      audioSource.loop = true;
      audioSource.connect(gainNode);
      audioSource.start();
    }

    soundToggle.addEventListener("click", async () => {
      await initAudio();
      if (!audioCtx) return;
      soundOn = !soundOn;
      gainNode.gain.linearRampToValueAtTime(soundOn ? 0.12 : 0, audioCtx.currentTime + 0.5);
      soundToggle.setAttribute("aria-pressed", String(soundOn));
      iconOff.style.display = soundOn ? "none" : "block";
      iconOn.style.display = soundOn ? "block" : "none";
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
          easterEgg.classList.add("is-visible");
          // Explosion de particules dorées
          const rect = { left: innerWidth / 2 - 100, top: innerHeight / 2 - 100, width: 200, height: 200 };
          particles.transition(rect, 0);
          gsap.fromTo(easterEgg, { opacity: 0 }, { opacity: 1, duration: 0.5 });
          setTimeout(() => {
            gsap.to(easterEgg, { opacity: 0, duration: 1, onComplete: () => easterEgg.classList.remove("is-visible") });
          }, 3500);
        }
      }
    } else { konamiIdx = 0; }
  });

  /* =================================================================
     CHATBOT — 10 questions, calcul de prix théorique
     ================================================================= */
  const chatMessages = document.getElementById("chatbot-messages");
  const chatPills = document.getElementById("chatbot-pills");
  const chatTyping = document.getElementById("chatbot-typing");
  const chatProgress = document.getElementById("chatbot-progress");
  const chatData = { baseCost: 0, multiplier: 1, answers: {}, userName: "" };

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

  // Total d'étapes pour la progression (name + rate + q1-q10 + contact = 13)
  const STEP_ORDER = ["name","rate","q1","q2","q3","q4","q5","q6","q7","q8","q9","q10","contact","done"];

  function renderStep(stepId) {
    const step = getStep(stepId);
    if (!step) return;

    chatPills.innerHTML = "";
    showTyping();

    // Indicateur de progression
    const chatStatus = document.querySelector(".chatbot-status");
    const stepIdx = STEP_ORDER.indexOf(stepId);
    if (stepId === "done") {
      chatStatus.textContent = "Devis prêt ✓";
      chatProgress.style.setProperty("--chat-progress", "100%");
    } else if (stepIdx >= 0) {
      const pct = Math.round((stepIdx / (STEP_ORDER.length - 1)) * 100);
      chatStatus.textContent = stepIdx === 0 ? "En ligne" : `${stepIdx} / ${STEP_ORDER.length - 2}`;
      chatProgress.style.setProperty("--chat-progress", pct + "%");
    }

    setTimeout(() => {
      hideTyping();

      // Résoudre le texte du bot (templates avec {name})
      let botText = step.botTemplate
        ? step.botTemplate.replace(/\{name\}/g, chatData.userName || "")
        : step.bot;

      if (stepId === "done") {
        const name = chatData.userName || "";
        const total = Math.round(chatData.baseCost * chatData.multiplier);
        const low = Math.round(total * 0.85);
        const high = Math.round(total * 1.15);
        botText = `Merci ${name} ! 🎯 D'après vos réponses, votre projet est estimé entre ${formatPrice(low)}€ et ${formatPrice(high)}€ TTC. Scory vous recontacte sous 24h avec un devis détaillé. À bientôt !`;
      }

      addBotMessage(botText);

      if (step.options && step.options.length > 0) {
        step.options.forEach((opt, idx) => {
          const btn = document.createElement("button");
          btn.className = "chat-pill";
          btn.textContent = opt.label;
          btn.setAttribute("role", "option");
          btn.addEventListener("keydown", (e) => {
            const pills = [...chatPills.querySelectorAll(".chat-pill")];
            let target;
            if (e.key === "ArrowRight" || e.key === "ArrowDown") {
              e.preventDefault();
              target = pills[(idx + 1) % pills.length];
            } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
              e.preventDefault();
              target = pills[(idx - 1 + pills.length) % pills.length];
            }
            if (target) target.focus();
          });
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
        const firstPill = chatPills.querySelector(".chat-pill");
        if (firstPill) requestAnimationFrame(() => firstPill.focus({ preventScroll: true }));
      } else if (step.freeText) {
        const input = document.createElement("input");
        input.type = stepId === "contact" ? "email" : "text";
        input.placeholder = step.placeholder || "Tapez ici…";
        input.className = "chat-input";
        const send = document.createElement("button");
        send.className = "chat-pill";
        send.textContent = "Envoyer";
        const submit = () => {
          const val = input.value.trim();
          if (!val) return;
          // Stocker le prénom si c'est l'étape "name"
          if (stepId === "name") chatData.userName = val;
          chatData.answers[stepId] = val;
          addUserMessage(val);
          chatPills.innerHTML = "";
          renderStep(step.next);
        };
        send.addEventListener("click", submit);
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
        chatPills.appendChild(input);
        chatPills.appendChild(send);
        requestAnimationFrame(() => input.focus());
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
          chatData.userName = "";
          chatPills.innerHTML = "";
          document.querySelector(".chatbot-status").textContent = "En ligne";
          chatProgress.style.setProperty("--chat-progress", "0%");
          renderStep("name");
        });
        chatPills.appendChild(restart);
      }
    }, 700 + Math.random() * 500);
  }

  // Lancer le chatbot quand il est visible
  const chatObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      chatObserver.disconnect();
      renderStep("name");
    }
  }, { threshold: 0.3 });
  chatObserver.observe(document.getElementById("chatbot-section"));

  /* =================================================================
     BOOKING — Planning in-app
     ================================================================= */
  const bookingOverlay = document.getElementById("booking-overlay");
  const bookingModal = document.getElementById("booking-modal");
  const openBookingBtn = document.getElementById("open-booking");
  const closeBookingBtn = document.getElementById("booking-close");

  if (bookingOverlay && openBookingBtn) {
    const SLOTS = ["09:00","10:00","11:00","14:00","15:00","16:00","17:00"];
    const MONTHS_FR = ["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];
    let calYear, calMonth, selectedDate = null, selectedSlot = null;

    const stepCal = document.getElementById("booking-step-cal");
    const stepTime = document.getElementById("booking-step-time");
    const stepForm = document.getElementById("booking-step-form");
    const stepDone = document.getElementById("booking-step-done");
    const calGrid = document.getElementById("cal-grid");
    const calMonthLabel = document.getElementById("cal-month");
    const slotsContainer = document.getElementById("booking-slots");

    function showStep(step) {
      [stepCal, stepTime, stepForm, stepDone].forEach((s) => s.classList.add("booking-step--hidden"));
      step.classList.remove("booking-step--hidden");
    }

    function openBooking() {
      const now = new Date();
      calYear = now.getFullYear();
      calMonth = now.getMonth();
      selectedDate = null;
      selectedSlot = null;
      showStep(stepCal);
      renderCalendar();
      bookingOverlay.classList.add("is-open");
      bookingOverlay.setAttribute("aria-hidden", "false");
    }

    function closeBooking() {
      bookingOverlay.classList.remove("is-open");
      bookingOverlay.setAttribute("aria-hidden", "true");
    }

    function renderCalendar() {
      calMonthLabel.textContent = `${MONTHS_FR[calMonth]} ${calYear}`;
      calGrid.innerHTML = "";
      const firstDay = new Date(calYear, calMonth, 1);
      let startDay = firstDay.getDay(); // 0=dim
      if (startDay === 0) startDay = 7; // lun=1
      const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
      const today = new Date();
      today.setHours(0,0,0,0);

      // Cases vides avant le 1er
      for (let i = 1; i < startDay; i++) {
        const empty = document.createElement("div");
        calGrid.appendChild(empty);
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(calYear, calMonth, d);
        const btn = document.createElement("button");
        btn.className = "cal-day";
        btn.textContent = d;
        const dayOfWeek = date.getDay();
        const isPast = date < today;
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        if (isPast || isWeekend) {
          btn.disabled = true;
        } else {
          if (date.getTime() === today.getTime()) btn.classList.add("is-today");
          btn.addEventListener("click", () => {
            selectedDate = date;
            calGrid.querySelectorAll(".cal-day").forEach((b) => b.classList.remove("is-selected"));
            btn.classList.add("is-selected");
            // Passer aux créneaux après un court délai visuel
            setTimeout(() => goToSlots(), 200);
          });
        }
        calGrid.appendChild(btn);
      }
    }

    function formatDateFr(date) {
      const jours = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
      return `${jours[date.getDay()]} ${date.getDate()} ${MONTHS_FR[date.getMonth()]} ${date.getFullYear()}`;
    }

    function goToSlots() {
      if (!selectedDate) return;
      document.getElementById("booking-date-chosen").textContent = formatDateFr(selectedDate);
      slotsContainer.innerHTML = "";
      SLOTS.forEach((slot) => {
        const btn = document.createElement("button");
        btn.className = "booking-slot";
        btn.textContent = slot;
        btn.addEventListener("click", () => {
          selectedSlot = slot;
          slotsContainer.querySelectorAll(".booking-slot").forEach((b) => b.classList.remove("is-selected"));
          btn.classList.add("is-selected");
          setTimeout(() => goToForm(), 200);
        });
        slotsContainer.appendChild(btn);
      });
      showStep(stepTime);
    }

    function goToForm() {
      if (!selectedDate || !selectedSlot) return;
      document.getElementById("booking-summary").textContent = `${formatDateFr(selectedDate)} a ${selectedSlot}`;
      showStep(stepForm);
      document.getElementById("booking-name").focus();
    }

    // Navigation
    openBookingBtn.addEventListener("click", (e) => { e.preventDefault(); openBooking(); });
    closeBookingBtn.addEventListener("click", closeBooking);
    bookingOverlay.addEventListener("click", (e) => { if (e.target === bookingOverlay) closeBooking(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && bookingOverlay.classList.contains("is-open")) closeBooking(); });

    document.getElementById("cal-prev").addEventListener("click", () => {
      calMonth--;
      if (calMonth < 0) { calMonth = 11; calYear--; }
      renderCalendar();
    });
    document.getElementById("cal-next").addEventListener("click", () => {
      calMonth++;
      if (calMonth > 11) { calMonth = 0; calYear++; }
      renderCalendar();
    });
    document.getElementById("booking-back-cal").addEventListener("click", () => showStep(stepCal));
    document.getElementById("booking-back-time").addEventListener("click", () => showStep(stepTime));

    document.getElementById("booking-submit").addEventListener("click", () => {
      const name = document.getElementById("booking-name").value.trim();
      const email = document.getElementById("booking-email").value.trim();
      if (!name || !email) return;
      document.getElementById("booking-done-detail").textContent = `${formatDateFr(selectedDate)} a ${selectedSlot} — ${name} (${email})`;
      showStep(stepDone);
      // Reset form pour prochain usage
      document.getElementById("booking-name").value = "";
      document.getElementById("booking-email").value = "";
      document.getElementById("booking-msg").value = "";
    });
  }
}

main();
