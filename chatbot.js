/**
 * SCORY — chatbot.js
 * Chatbot devis interactif : prenom, note, 10 questions, estimation prix.
 */
import { CHAT_FLOW } from "./data.js";

const STEP_ORDER = ["name","rate","q1","q2","q3","q4","q5","q6","q7","q8","q9","q10","contact","done"];

/** Etat global du chatbot — accessible depuis l'exterieur */
export const chatState = { completed: false };

/** @param {{ isValidEmail: (e:string)=>boolean, onComplete?: ()=>void }} deps */
export function initChatbot({ isValidEmail, onComplete }) {
  const chatMessages = document.getElementById("chatbot-messages");
  const chatPills = document.getElementById("chatbot-pills");
  const chatTyping = document.getElementById("chatbot-typing");
  const chatProgress = document.getElementById("chatbot-progress");
  const chatSection = document.getElementById("chatbot-section");
  if (!chatMessages || !chatPills || !chatSection) return;

  const chatData = { baseCost: 0, multiplier: 1, answers: {}, userName: "" };

  function getStep(id) { return CHAT_FLOW.find((s) => s.id === id); }

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
    if (stepId === "done") {
      chatStatus.textContent = "Devis pret";
      chatProgress.style.setProperty("--chat-progress", "100%");
    } else if (stepIdx >= 0) {
      const pct = Math.round((stepIdx / (STEP_ORDER.length - 1)) * 100);
      chatStatus.textContent = stepIdx === 0 ? "En ligne" : `${stepIdx} / ${STEP_ORDER.length - 2}`;
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
        const low = Math.round(total * 0.85);
        const high = Math.round(total * 1.15);
        botText = `Merci ${name} ! D'apres vos reponses, votre projet est estime entre ${formatPrice(low)} et ${formatPrice(high)} TTC (estimation non contractuelle). Scory vous recontacte sous 24h avec un devis detaille.`;
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
          const val = input.value.trim();
          if (!val) return;
          if (stepId === "contact" && !isValidEmail(val)) { input.style.borderColor = "#f87171"; return; }
          input.style.borderColor = "";
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
        // Proposer de prendre RDV
        const rdvBtn = document.createElement("button");
        rdvBtn.className = "chat-pill";
        rdvBtn.style.background = "linear-gradient(135deg, var(--accent-gold), var(--accent-amber))";
        rdvBtn.style.color = "var(--surface-void)";
        rdvBtn.style.fontWeight = "600";
        rdvBtn.textContent = "Prendre rendez-vous";
        rdvBtn.addEventListener("click", () => {
          if (typeof onComplete === "function") onComplete();
        });
        chatPills.appendChild(rdvBtn);
        const restart = document.createElement("button");
        restart.className = "chat-pill";
        restart.textContent = "Recommencer";
        restart.addEventListener("click", () => {
          chatMessages.innerHTML = "";
          chatData.baseCost = 0;
          chatData.multiplier = 1;
          chatData.answers = {};
          chatData.userName = "";
          chatPills.innerHTML = "";
          chatState.completed = false;
          document.getElementById("chatbot-status-text").textContent = "En ligne";
          chatProgress.style.setProperty("--chat-progress", "0%");
          renderStep("name");
        });
        chatPills.appendChild(restart);
      }
    }, 700 + Math.random() * 500);
  }

  // Lancer quand visible
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      observer.disconnect();
      renderStep("name");
    }
  }, { threshold: 0.3 });
  observer.observe(chatSection);
}
