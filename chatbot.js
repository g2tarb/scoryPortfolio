/**
 * SCORY — chatbot.js
 * Mini-bot prospect : 5 questions multi-choix + capture contact.
 * Pas de calcul de devis. Resultat envoye par mailto a gdbyana@gmail.com
 * pour relance manuelle.
 */
import { getLang } from "./i18n.js";

const CONTACT_TARGET = "gdbyana@gmail.com";

/** Flux 5 questions (FR + EN) — multi-choix uniquement */
const FLOW = {
  fr: [
    { id: "type", bot: "Salut, moi c'est Scory. Tu veux quel type de projet ?",
      options: ["Site vitrine","Landing page","E-commerce","App / SaaS","Application mobile","Autre"] },
    { id: "objectif", bot: "Cool. Et c'est pour faire quoi ?",
      options: ["Promouvoir mon entreprise","Vendre en ligne","Capter des leads","Lancer une startup","Autre"] },
    { id: "style", bot: "Tu vois le style comment ?",
      options: ["Premium / luxe","Moderne / tech","Epure / minimaliste","Creatif / artistique","Pas d'idee"] },
    { id: "delai", bot: "C'est pour quand ?",
      options: ["Urgent (< 2 semaines)","1 mois","2-3 mois","Pas presse"] },
    { id: "budget", bot: "Et cote budget, t'es ou ?",
      options: ["< 1 000 €","1 000 - 3 000 €","3 000 - 10 000 €","10 000 €+","A discuter"] },
  ],
  en: [
    { id: "type", bot: "Hey, I'm Scory. What kind of project do you have in mind?",
      options: ["Showcase site","Landing page","E-commerce","Web app / SaaS","Mobile app","Other"] },
    { id: "objectif", bot: "Cool. What's it for?",
      options: ["Promote my business","Sell online","Capture leads","Launch a startup","Other"] },
    { id: "style", bot: "What style are you after?",
      options: ["Premium / luxe","Modern / tech","Clean / minimalist","Creative / artistic","Not sure yet"] },
    { id: "delai", bot: "When do you need it?",
      options: ["Urgent (< 2 weeks)","1 month","2-3 months","No rush"] },
    { id: "budget", bot: "And budget-wise?",
      options: ["< €1,000","€1,000 - 3,000","€3,000 - 10,000","€10,000+","Let's discuss"] },
  ],
};

const I18N = {
  fr: {
    contactIntro: "Top, j'ai ce qu'il faut. Laisse-moi tes coordonnees, je te recontacte sous 24h.",
    namePh: "Ton prenom...", emailPh: "ton@email.com", msgPh: "Un mot de plus ? (optionnel)",
    submit: "Envoyer", submitting: "Envoi...", invalidEmail: "Email invalide",
    done: "Merci ! Je te reviens vite.", restart: "Recommencer",
    summaryHeader: "Resume de ta demande",
  },
  en: {
    contactIntro: "Got it. Drop your contact info, I'll get back to you within 24h.",
    namePh: "Your first name...", emailPh: "you@email.com", msgPh: "Anything else? (optional)",
    submit: "Send", submitting: "Sending...", invalidEmail: "Invalid email",
    done: "Thanks! I'll be in touch.", restart: "Start over",
    summaryHeader: "Your request",
  },
};

/** Sanitisation basique anti-XSS sur les inputs libres */
function sanitize(raw) {
  if (typeof raw !== "string") return "";
  return raw.replace(/<[^>]*>/g, "").trim().slice(0, 300)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

export const chatState = { completed: false, restart: null };

export function initChatbot({ isValidEmail }) {
  const messagesEl = document.getElementById("chatbot-messages");
  const pillsEl = document.getElementById("chatbot-pills");
  const progressEl = document.getElementById("chatbot-progress");
  const statusEl = document.getElementById("chatbot-status-text");
  if (!messagesEl || !pillsEl) return;

  const lang = () => (getLang() === "en" ? "en" : "fr");
  let answers = {};
  let stepIdx = 0; // 0..4 = questions, 5 = contact form, 6 = done

  function tx() { return I18N[lang()]; }
  function flow() { return FLOW[lang()]; }

  function appendBot(text) {
    const m = document.createElement("div");
    m.className = "chat-msg chat-msg--bot";
    m.textContent = text;
    messagesEl.appendChild(m);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function appendUser(text) {
    const m = document.createElement("div");
    m.className = "chat-msg chat-msg--user";
    m.textContent = text;
    messagesEl.appendChild(m);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setProgress(pct) {
    if (progressEl) progressEl.style.setProperty("--progress", `${pct}%`);
  }

  function clearPills() { pillsEl.innerHTML = ""; }

  function renderQuestion() {
    const q = flow()[stepIdx];
    if (!q) return renderContact();
    appendBot(q.bot);
    setProgress(((stepIdx) / (flow().length + 1)) * 100);
    clearPills();
    for (const opt of q.options) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chat-pill";
      btn.textContent = opt;
      btn.addEventListener("click", () => {
        answers[q.id] = opt;
        appendUser(opt);
        clearPills();
        stepIdx += 1;
        setTimeout(() => {
          if (stepIdx >= flow().length) renderContact();
          else renderQuestion();
        }, 250);
      });
      pillsEl.appendChild(btn);
    }
  }

  function renderContact() {
    appendBot(tx().contactIntro);
    setProgress(((flow().length) / (flow().length + 1)) * 100);
    clearPills();

    const form = document.createElement("form");
    form.className = "chat-form";
    form.noValidate = true;
    form.innerHTML = `
      <input type="text" name="name" placeholder="${tx().namePh}" required maxlength="60" autocomplete="given-name" />
      <input type="email" name="email" placeholder="${tx().emailPh}" required maxlength="120" autocomplete="email" />
      <textarea name="msg" placeholder="${tx().msgPh}" maxlength="500" rows="2"></textarea>
      <button type="submit" class="chat-form__submit">${tx().submit}</button>
      <span class="chat-form__error" aria-live="polite"></span>
    `;
    pillsEl.appendChild(form);

    const errEl = form.querySelector(".chat-form__error");
    const submitBtn = form.querySelector(".chat-form__submit");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = sanitize(form.name.value);
      const email = sanitize(form.email.value);
      const msg = sanitize(form.msg.value);

      if (!name || !email || (isValidEmail && !isValidEmail(email))) {
        errEl.textContent = tx().invalidEmail;
        return;
      }
      errEl.textContent = "";
      submitBtn.disabled = true;
      submitBtn.textContent = tx().submitting;

      // Construit un mailto pre-rempli vers gdbyana@gmail.com
      const subject = `Lead portfolio Scory — ${name}`;
      const lines = [
        `${tx().summaryHeader}:`,
        ...flow().map((q) => `• ${q.id}: ${answers[q.id] || "-"}`),
        ``,
        `Prenom: ${name}`,
        `Email: ${email}`,
        msg ? `Message: ${msg}` : "",
      ].filter(Boolean);
      const body = lines.join("\n");
      const mailto = `mailto:${CONTACT_TARGET}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      // Sauvegarde locale (au cas ou le mailto echoue)
      try {
        localStorage.setItem("scory_lead", JSON.stringify({ name, email, msg, answers, ts: Date.now() }));
      } catch (_e) {}

      window.location.href = mailto;

      setTimeout(() => {
        appendUser(`${name} · ${email}`);
        clearPills();
        appendBot(tx().done);
        setProgress(100);
        if (statusEl) statusEl.textContent = tx().done;
        chatState.completed = true;

        const restartBtn = document.createElement("button");
        restartBtn.type = "button";
        restartBtn.className = "chat-pill chat-pill--restart";
        restartBtn.textContent = tx().restart;
        restartBtn.addEventListener("click", () => chatState.restart && chatState.restart());
        pillsEl.appendChild(restartBtn);
      }, 600);
    });
  }

  function reset() {
    answers = {};
    stepIdx = 0;
    messagesEl.innerHTML = "";
    clearPills();
    chatState.completed = false;
    if (statusEl) statusEl.textContent = (lang() === "en" ? "Online" : "En ligne");
    renderQuestion();
  }

  chatState.restart = reset;
  reset();
}
