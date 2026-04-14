/**
 * SCORY — chatbot.js
 * Chatbot devis interactif : prenom, note, 10 questions, estimation prix.
 * Envoie un email automatique a chaque devis complete.
 */
import { CHAT_FLOW as CHAT_FLOW_ALL } from "./data.js";
import { getLang } from "./i18n.js";
function CHAT_FLOW() { return CHAT_FLOW_ALL[getLang()] || CHAT_FLOW_ALL.fr; }

const STEP_ORDER = ["name","rate","q1","q2","q3","q4","q5","q6","q7","q8","q9","q10","contact","done"];

/**
 * SECURITY: Input sanitization for all user-provided text.
 * Prevents XSS via innerHTML injection, strips dangerous characters,
 * and enforces a maximum length to mitigate abuse.
 *
 * NOTE: Server-side validation (prepared statements, parameterized queries,
 * rate limiting, CSRF tokens) would also be needed if this data were sent
 * to a backend. This site is frontend-only / static, so those measures
 * are not applicable here. If a backend is added later (e.g. Node.js/Express),
 * also implement:
 *   - express-rate-limit for API throttling
 *   - helmet.js for HTTP header hardening
 *   - csurf or double-submit cookie for CSRF protection
 *   - Parameterized SQL queries (never string concatenation)
 *   - bcrypt for any password hashing
 *   - JWT with short expiry + refresh tokens + server-side blacklist
 */
function sanitizeInput(raw) {
  if (typeof raw !== "string") return "";
  // Strip HTML tags to prevent XSS
  let clean = raw.replace(/<[^>]*>/g, "");
  // Trim whitespace
  clean = clean.trim();
  // Limit length to 200 characters
  clean = clean.slice(0, 200);
  // Escape special characters that could be used in injection attacks
  clean = clean
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
  return clean;
}

/**
 * CONFIGURATION EMAIL
 * Option 1 : Formspree (recommande) — gratuit, va sur https://formspree.io, cree un formulaire, colle l'ID ici
 * Option 2 : Web3Forms — va sur https://web3forms.com, recupere ton access_key, colle-le ici
 * Option 3 : Ton propre webhook (n8n, Make, Zapier...)
 */
const EMAIL_CONFIG = {
  // Decommenter UNE des options ci-dessous :
  // formspree: "ton_form_id",           // ex: "xrgvabcd"
  // web3forms: "ton_access_key",        // ex: "xxxxxxxx-xxxx-xxxx-xxxx"
  // webhook: "https://ton-webhook.url", // ex: n8n webhook URL
  fallbackEmail: "gdbyana@gmail.com",
};

/** Envoie les donnees du devis par email */
async function sendDevisEmail(data) {
  const payload = {
    name: data.userName,
    email: data.answers.contact || "",
    rating: data.answers.rate || "",
    estimate_low: data._low,
    estimate_high: data._high,
    answers: Object.entries(data.answers).map(([k, v]) => `${k}: ${v}`).join("\n"),
    _subject: `Nouveau devis SCORY — ${data.userName}`,
  };

  // Option 1 : Formspree
  if (EMAIL_CONFIG.formspree) {
    try {
      await fetch(`https://formspree.io/f/${EMAIL_CONFIG.formspree}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      return true;
    } catch { /* fallback */ }
  }

  // Option 2 : Web3Forms
  if (EMAIL_CONFIG.web3forms) {
    try {
      await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_key: EMAIL_CONFIG.web3forms, ...payload }),
      });
      return true;
    } catch { /* fallback */ }
  }

  // Option 3 : Webhook custom
  if (EMAIL_CONFIG.webhook) {
    try {
      await fetch(EMAIL_CONFIG.webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return true;
    } catch { /* fallback */ }
  }

  // Fallback : mailto (necessite action manuelle du prospect)
  const subject = encodeURIComponent(`Devis SCORY — ${data.userName}`);
  const body = encodeURIComponent(
    `Nom: ${data.userName}\nEmail: ${data.answers.contact || "non fourni"}\n\n` +
    `Estimation: ${data._low} - ${data._high}\n\n` +
    `Reponses:\n${Object.entries(data.answers).map(([k, v]) => `- ${k}: ${v}`).join("\n")}`
  );
  window.open(`mailto:${EMAIL_CONFIG.fallbackEmail}?subject=${subject}&body=${body}`, "_self");
  return false;
}

/** Etat global du chatbot — accessible depuis l'exterieur */
export const chatState = { completed: false, restart: null };

/** @param {{ isValidEmail: (e:string)=>boolean, onComplete?: ()=>void }} deps */
export function initChatbot({ isValidEmail, onComplete }) {
  const chatMessages = document.getElementById("chatbot-messages");
  const chatPills = document.getElementById("chatbot-pills");
  const chatTyping = document.getElementById("chatbot-typing");
  const chatProgress = document.getElementById("chatbot-progress");
  const chatSection = document.getElementById("chatbot-section");
  if (!chatMessages || !chatPills || !chatSection) return;

  const chatData = { baseCost: 0, multiplier: 1, answers: {}, userName: "" };

  function getStep(id) { return CHAT_FLOW().find((s) => s.id === id); }

  function scrollBottom() {
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
  }

  function addMsg(text, cls) {
    const div = document.createElement("div");
    div.className = `chat-msg ${cls}`;
    div.textContent = text;
    chatMessages.appendChild(div);
    requestAnimationFrame(scrollBottom);
  }

  function showTyping() { chatTyping.style.display = "flex"; }
  function hideTyping() { chatTyping.style.display = "none"; }

  function formatPrice(n) { return Math.round(n).toLocaleString("fr-FR"); }

  function renderStep(stepId) {
    const step = getStep(stepId);
    if (!step) return;
    chatPills.innerHTML = "";
    showTyping();

    const chatStatus = document.getElementById("chatbot-status-text");
    const stepIdx = STEP_ORDER.indexOf(stepId);
    if (!chatStatus) return;
    const isFr = getLang() === "fr";
    if (stepId === "done") {
      chatStatus.textContent = isFr ? "Devis pret" : "Quote ready";
      chatProgress.style.setProperty("--chat-progress", "100%");
    } else if (stepIdx >= 0) {
      const pct = Math.round((stepIdx / (STEP_ORDER.length - 1)) * 100);
      chatStatus.textContent = stepIdx === 0 ? (isFr ? "En ligne" : "Online") : `${stepIdx} / ${STEP_ORDER.length - 2}`;
      chatProgress.style.setProperty("--chat-progress", pct + "%");
    }

    setTimeout(() => {
      hideTyping();
      let botText = step.botTemplate
        ? step.botTemplate.replace(/\{name\}/g, chatData.userName || "")
        : step.bot;

      if (stepId === "done") {
        const name = chatData.userName || "";
        const total = Math.round(chatData.baseCost * chatData.multiplier);
        let low = Math.round(total * 0.85);
        let high = Math.round(total * 1.15);

        // Appliquer le discount secret si debloquer
        const discount = localStorage.getItem("scory_discount");
        let discountText = "";
        if (discount === "SCROLL5") {
          const reduction = 0.95; // -5%
          low = Math.round(low * reduction);
          high = Math.round(high * reduction);
          discountText = getLang() === "fr"
            ? `\n\n🎁 Code SCROLL5 applique : -5% ! Prix apres reduction :`
            : `\n\n🎁 Code SCROLL5 applied: -5% off! Price after discount:`;
        }

        botText = getLang() === "fr"
          ? `Merci ${name} ! D'apres vos reponses, votre projet est estime entre ${formatPrice(low)} et ${formatPrice(high)} TTC (estimation non contractuelle).${discountText ? discountText + ` ${formatPrice(low)} - ${formatPrice(high)}` : ""} Scory vous recontacte sous 24h avec un devis detaille.`
          : `Thanks ${name}! Based on your answers, your project is estimated between ${formatPrice(low)} and ${formatPrice(high)} (non-binding estimate).${discountText ? discountText + ` ${formatPrice(low)} - ${formatPrice(high)}` : ""} Scory will get back to you within 24h with a detailed quote.`;
      }

      addMsg(botText, "chat-msg--bot");

      if (step.options && step.options.length > 0) {
        step.options.forEach((opt, idx) => {
          const btn = document.createElement("button");
          btn.className = "chat-pill";
          btn.textContent = opt.label;
          btn.setAttribute("role", "option");
          btn.addEventListener("keydown", (e) => {
            const pills = [...chatPills.querySelectorAll(".chat-pill")];
            let target;
            if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); target = pills[(idx + 1) % pills.length]; }
            else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); target = pills[(idx - 1 + pills.length) % pills.length]; }
            if (target) target.focus();
          });
          btn.addEventListener("click", () => {
            if (typeof opt.cost === "number") chatData.baseCost += opt.cost;
            if (typeof opt.multiplier === "number") chatData.multiplier = opt.multiplier;
            chatData.answers[stepId] = opt.label;
            addMsg(opt.label, "chat-msg--user");
            chatPills.innerHTML = "";
            renderStep(opt.next);
          });
          chatPills.appendChild(btn);
        });
        const first = chatPills.querySelector(".chat-pill");
        if (first) requestAnimationFrame(() => first.focus({ preventScroll: true }));
      } else if (step.freeText) {
        const input = document.createElement("input");
        input.type = stepId === "contact" ? "email" : "text";
        input.placeholder = step.placeholder || "Tapez ici...";
        input.className = "chat-input";
        const send = document.createElement("button");
        send.className = "chat-pill";
        send.textContent = "Envoyer";
        const submit = () => {
          /* SECURITY: Sanitize all free-text user input before processing */
          const raw = input.value.trim();
          if (!raw) return;
          /* For email validation, check the raw value before sanitization
           * (sanitization would escape '@' and break the check) */
          if (stepId === "contact" && !isValidEmail(raw)) { input.style.borderColor = "#f87171"; return; }
          input.style.borderColor = "";
          /* Sanitize after validation — email addresses are stored as-is
           * for functional mailto: links, names/text are sanitized */
          const val = stepId === "contact" ? raw.slice(0, 200) : sanitizeInput(raw);
          if (stepId === "name") chatData.userName = val;
          chatData.answers[stepId] = val;
          addMsg(val, "chat-msg--user");
          chatPills.innerHTML = "";
          renderStep(step.next);
        };
        send.addEventListener("click", submit);
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
        chatPills.appendChild(input);
        chatPills.appendChild(send);
        requestAnimationFrame(() => input.focus());
      }

      if (stepId === "done") {
        chatState.completed = true;
        // Envoyer le devis par email
        chatData._low = formatPrice(Math.round(chatData.baseCost * chatData.multiplier * 0.85));
        chatData._high = formatPrice(Math.round(chatData.baseCost * chatData.multiplier * 1.15));
        sendDevisEmail(chatData);
        // Proposer de prendre RDV
        const rdvBtn = document.createElement("button");
        rdvBtn.className = "chat-pill";
        rdvBtn.style.background = "linear-gradient(135deg, var(--accent-gold), var(--accent-amber))";
        rdvBtn.style.color = "var(--surface-void)";
        rdvBtn.style.fontWeight = "600";
        rdvBtn.textContent = getLang() === "fr" ? "Prendre rendez-vous" : "Book a meeting";
        rdvBtn.addEventListener("click", () => {
          if (typeof onComplete === "function") onComplete();
        });
        chatPills.appendChild(rdvBtn);
        const restart = document.createElement("button");
        restart.className = "chat-pill";
        restart.textContent = getLang() === "fr" ? "Recommencer" : "Start over";
        restart.addEventListener("click", resetChat);
        chatPills.appendChild(restart);
      }
    }, 700 + Math.random() * 500);
  }

  function resetChat() {
    chatMessages.innerHTML = "";
    chatData.baseCost = 0;
    chatData.multiplier = 1;
    chatData.answers = {};
    chatData.userName = "";
    chatPills.innerHTML = "";
    chatState.completed = false;
    const status = document.getElementById("chatbot-status-text");
    if (status) status.textContent = getLang() === "fr" ? "En ligne" : "Online";
    chatProgress.style.setProperty("--chat-progress", "0%");
    renderStep("name");
  }

  // Exposer restart pour le toggle langue
  chatState.restart = resetChat;

  // Lancer quand visible
  let chatStarted = false;
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !chatStarted) {
      chatStarted = true;
      observer.disconnect();
      renderStep("name");
    }
  }, { threshold: 0.3 });
  observer.observe(chatSection);
}
