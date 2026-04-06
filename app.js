/**
 * SCORY — app.js
 * Navigation flèches (1 disque visible), long press détails, chatbot conversationnel.
 */
import gsap from "gsap";
import { FlaynnNeuralBackground } from "./three-neural.js";
import { WaterReflectionLayer } from "./three-water.js";

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

const CODE_LOUPE = `// SCORY — app.js (extrait)
import gsap from "gsap";
import { FlaynnNeuralBackground } from "./three-neural.js";

const EASE_SPRING_HEAVY = "back.out(1.32)";

export function mountCarousel(neural, ctx) {
  const tl = gsap.timeline({
    onUpdate: () => neural.setTransitionProgress(tl.progress()),
    onComplete: () => neural.setTransitionProgress(0),
  });
  tl.to(current, { rotateX: -15, y: -40, opacity: 0, ease: "power2.in" });
  tl.fromTo(next, { rotateX: 45, y: 100, opacity: 0 },
    { rotateX: 0, y: 0, opacity: 1, ease: EASE_SPRING_HEAVY }, 0.12);
}
`;

/** Chatbot : arbre de conversation */
const CHAT_FLOW = [
  {
    id: "start",
    bot: "Bienvenue ! 👋 Quel type de projet avez-vous en tête ?",
    options: [
      { label: "Site vitrine", next: "budget", value: "Site vitrine" },
      { label: "Landing page", next: "budget", value: "Landing page" },
      { label: "SaaS / App web", next: "budget", value: "SaaS / App web" },
      { label: "Autre chose", next: "other", value: "Autre" },
    ],
  },
  {
    id: "other",
    bot: "Pas de problème ! Décrivez-moi votre projet en quelques mots :",
    freeText: true,
    next: "budget",
  },
  {
    id: "budget",
    bot: "Super choix ! Et côté budget, vous êtes sur quelle fourchette ?",
    options: [
      { label: "< 1 500 €", next: "timeline", value: "< 1 500 €" },
      { label: "1 500 – 3 000 €", next: "timeline", value: "1 500 – 3 000 €" },
      { label: "3 000 € +", next: "timeline", value: "3 000 € +" },
      { label: "À définir", next: "timeline", value: "À définir" },
    ],
  },
  {
    id: "timeline",
    bot: "Dernière question : c'est pour quand ?",
    options: [
      { label: "Urgent (< 2 sem)", next: "contact", value: "Urgent" },
      { label: "Ce mois-ci", next: "contact", value: "Ce mois" },
      { label: "Pas pressé", next: "contact", value: "Pas pressé" },
    ],
  },
  {
    id: "contact",
    bot: "Parfait ! Laissez-moi votre email et Scory vous recontacte sous 24h :",
    freeText: true,
    next: "done",
  },
  {
    id: "done",
    bot: "Merci ! 🎯 Scory va analyser votre projet et vous recontacter très vite. À bientôt !",
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
  const loupe = document.getElementById("expert-loupe");
  const loupeCode = loupe.querySelector("#expert-code-scroll code");
  const detailPanel = document.getElementById("detail-panel");
  const detailTitle = document.getElementById("detail-title");
  const detailText = document.getElementById("detail-text");
  const arrowLeft = document.getElementById("arrow-left");
  const arrowRight = document.getElementById("arrow-right");
  const dotsContainer = document.getElementById("nav-dots");

  if (!stage || !neuralHost || !carousel || !track) return;

  loupeCode.textContent = CODE_LOUPE;
  const reduced = prefersReducedMotion();

  const neural = new FlaynnNeuralBackground(neuralHost, { timeScale: reduced ? 0.22 : 1 });

  let water = null;
  let waterSplashTween = null;
  if (waterHost) {
    water = new WaterReflectionLayer(waterHost, { timeScale: reduced ? 0.22 : 1 });
    gsap.set(waterHost, { opacity: 0 });
  }
  gsap.set(neuralHost, { opacity: 1 });

  let activeIndex = 0;
  let animating = false;
  let longPressTimer = null;
  let detailVisible = false;

  const discs = () => [...track.querySelectorAll(".project-disc")];

  // Build dots
  function buildDots() {
    dotsContainer.innerHTML = "";
    const d = discs();
    d.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.className = "nav-dot" + (i === activeIndex ? " is-active" : "");
      dot.setAttribute("aria-label", `Projet ${i + 1}`);
      dot.addEventListener("click", () => goTo(i));
      dotsContainer.appendChild(dot);
    });
  }

  function updateDots() {
    const dots = dotsContainer.querySelectorAll(".nav-dot");
    dots.forEach((d, i) => d.classList.toggle("is-active", i === activeIndex));
  }

  function setLabel(i) {
    const p = PROJECTS[i];
    if (!p) return;
    labelTitle.textContent = p.title;
    labelDesc.textContent = p.desc;
  }

  function setActiveClasses(i) {
    discs().forEach((d, idx) => {
      d.classList.toggle("is-active", idx === i);
      d.setAttribute("aria-current", idx === i ? "true" : "false");
    });
  }

  /** Sync fond eau */
  async function syncProjectWater() {
    if (!water || !waterHost) return;
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
      .to(proxy, { p: 0.1, duration: 2.45, ease: "power3.out", onUpdate: () => water.setProgress(proxy.p) }, 0);
  }

  /** Navigation : transition d'un disque à l'autre */
  function goTo(nextIndex) {
    const d = discs();
    const n = d.length;
    if (n === 0 || animating) return;
    // Wrap around
    if (nextIndex < 0) nextIndex = n - 1;
    if (nextIndex >= n) nextIndex = 0;
    if (nextIndex === activeIndex) return;

    animating = true;
    const currentDisc = d[activeIndex];
    const nextDisc = d[nextIndex];
    const goingRight = nextIndex > activeIndex || (activeIndex === n - 1 && nextIndex === 0);

    if (reduced) {
      activeIndex = nextIndex;
      setActiveClasses(activeIndex);
      setLabel(activeIndex);
      updateDots();
      animating = false;
      void syncProjectWater();
      return;
    }

    // Exit current disc
    const exitY = goingRight ? -60 : 60;
    const enterY = goingRight ? 80 : -80;

    const tl = gsap.timeline({
      onUpdate: () => neural.setTransitionProgress(tl.progress()),
      onComplete: () => {
        activeIndex = nextIndex;
        gsap.set(currentDisc, { clearProps: "transform,opacity" });
        gsap.set(nextDisc, { clearProps: "transform" });
        setActiveClasses(activeIndex);
        setLabel(activeIndex);
        updateDots();
        neural.setTransitionProgress(0);
        animating = false;
        void syncProjectWater();
      },
    });

    // Current out
    tl.to(currentDisc, {
      rotateX: -15, y: exitY, opacity: 0, duration: 0.4, ease: "power2.in",
    }, 0);

    // Make next visible before animating in
    nextDisc.classList.add("is-active");
    nextDisc.style.pointerEvents = "auto";
    gsap.set(nextDisc, { rotateX: 30, y: enterY, opacity: 0, position: "relative" });

    tl.to(nextDisc, {
      rotateX: 0, y: 0, opacity: 1, duration: 0.65, ease: EASE_SPRING_HEAVY,
    }, 0.15);
  }

  // Arrow clicks
  arrowLeft.addEventListener("click", () => { if (!animating) goTo(activeIndex - 1); });
  arrowRight.addEventListener("click", () => { if (!animating) goTo(activeIndex + 1); });

  // Keyboard
  carousel.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); goTo(activeIndex + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); goTo(activeIndex - 1); }
  });

  // ===== LONG PRESS → DETAIL PANEL =====
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

  // Swipe support
  let swipeStartX = 0;
  carousel.addEventListener("touchstart", (e) => { swipeStartX = e.touches[0].clientX; }, { passive: true });
  carousel.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - swipeStartX;
    if (Math.abs(dx) > 60 && !animating) {
      if (dx < 0) goTo(activeIndex + 1);
      else goTo(activeIndex - 1);
    }
  });

  // Resize
  window.addEventListener("resize", () => {
    neural.resize();
    if (water) water.resize();
  }, { passive: true });

  // Init
  setActiveClasses(0);
  setLabel(0);
  buildDots();
  void syncProjectWater();

  if (reduced) {
    neural.setRotationInfluence(0);
    neural.setTransitionProgress(0);
  }

  // ===== CHATBOT =====
  const chatMessages = document.getElementById("chatbot-messages");
  const chatPills = document.getElementById("chatbot-pills");
  const chatTyping = document.getElementById("chatbot-typing");
  const chatData = {}; // collected answers

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

  function renderStep(stepId) {
    const step = getStep(stepId);
    if (!step) return;

    chatPills.innerHTML = "";
    showTyping();

    setTimeout(() => {
      hideTyping();
      addBotMessage(step.bot);

      if (step.options && step.options.length > 0) {
        step.options.forEach((opt) => {
          const btn = document.createElement("button");
          btn.className = "chat-pill";
          btn.textContent = opt.label;
          btn.addEventListener("click", () => {
            chatData[stepId] = opt.value;
            addUserMessage(opt.label);
            chatPills.innerHTML = "";
            renderStep(opt.next);
          });
          chatPills.appendChild(btn);
        });
      } else if (step.freeText) {
        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = "Tapez ici…";
        input.style.cssText = "flex:1;padding:0.5rem 1rem;border-radius:999px;border:1px solid rgba(192,132,252,0.3);background:rgba(192,132,252,0.08);color:rgba(245,242,255,0.9);font-size:0.85rem;font-family:var(--font-sans);outline:none;";
        const send = document.createElement("button");
        send.className = "chat-pill";
        send.textContent = "Envoyer";
        const submit = () => {
          const val = input.value.trim();
          if (!val) return;
          chatData[stepId] = val;
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
    }, 800 + Math.random() * 400);
  }

  // Lancer le chatbot quand il est visible
  const chatObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      chatObserver.disconnect();
      renderStep("start");
    }
  }, { threshold: 0.3 });
  chatObserver.observe(document.getElementById("chatbot-section"));
}

main();
