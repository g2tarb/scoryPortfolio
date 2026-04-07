/**
 * SCORY — data.js
 * Donnees projets, themes visuels, flux chatbot.
 * Separe de la logique pour lisibilite et maintenabilite.
 */

/** Projets : titre, desc courte, details, URL, screenshots */
export const PROJECTS = [
  {
    title: "Portfolio Scory",
    desc: "Ce musee digital — le portfolio que vous explorez en ce moment.",
    detail: "Portfolio concu comme un musee interactif : fond neural Three.js procedural, reflets eau via shader GLSL, carrousel a disques vinyle avec transitions particules, themes dynamiques par projet, chatbot devis integre. 100 % vanilla JS, zero framework.",
    stack: ["Three.js", "GLSL", "GSAP", "Vanilla JS"],
    url: null,
    screenshots: [],
  },
  {
    title: "4dayvelopment",
    desc: "Agence web — ecosystemes digitaux complets sur-mesure.",
    detail: "4Dayvelopment concoit des ecosystemes digitaux complets : branding, site sur-mesure, automations n8n, funnel de conversion. Design dark luxury avec curseur magnetique, animations Three.js, mode sombre/clair, formulaire intelligent avec devis instantane. 17+ projets livres, 100 % satisfaction.",
    stack: ["Node.js", "Express", "Three.js", "GSAP", "n8n", "Zod"],
    url: "https://4dayvelopment.fr/",
    screenshots: ["./image/fond4Day.jpg", "./image/4dayMobile.jpg"],
  },
  {
    title: "Clara Martinez",
    desc: "Coaching premium — transformer les freelances en entrepreneurs structures.",
    detail: "Site vitrine haut de gamme pour Clara Martinez, coach business a Paris. Methodologie Clarity en 12 semaines. Design dark luxe avec aurora borealis interactive en Canvas, glassmorphism, bento grid, curseur magnetique. Formulaire de contact, FAQ accordion, temoignages, timeline du programme.",
    stack: ["HTML5", "Canvas API", "Vanilla JS", "Lucide Icons", "Aurora BG"],
    url: "https://clara-martinez-project.vercel.app/",
    screenshots: ["./image/fondClara.jpg", "./image/claramartinezMobile.jpg"],
  },
  {
    title: "Flaynn",
    desc: "SaaS B2B — scoring objectif et matching startups-investisseurs.",
    detail: "Flaynn audite les startups sur 5 piliers (Marche, Produit, Traction, Equipe, Execution) et genere un score investor-grade en 24h. Design Dark Clarity inspire de Linear et Vercel. Dashboard SPA avec graphes reseau, formulaire multi-etapes, authentification JWT, scoring IA via Claude API, pipeline n8n automatise.",
    stack: ["Fastify 5", "PostgreSQL", "Three.js", "GSAP", "JWT", "Claude API"],
    url: "https://flaynn.tech/",
    screenshots: ["./image/fondFlaynn.jpg", "./image/flaynnMobile.jpg"],
  },
];

/** Themes visuels par projet — couleurs, polices, filtre neural */
export const THEMES = [
  {
    gold: "#c9a962", amber: "#e8b86d", ice: "#9ec8ff", magenta: "#c084fc",
    glow: "rgba(201,169,98,0.12)", glowStrong: "rgba(201,169,98,0.25)", glowDisc: "rgba(201,169,98,0.12)",
    fontDisplay: "'Cormorant Garamond', 'Times New Roman', serif",
    fontSans: "'DM Sans', system-ui, sans-serif",
    neuralFilter: "none",
    particleColors: [[201,169,98],[158,200,255],[192,132,252],[232,184,109],[245,242,255]],
  },
  {
    gold: "#DA5426", amber: "#f2b13b", ice: "#884083", magenta: "#DA5426",
    glow: "rgba(218,84,38,0.12)", glowStrong: "rgba(218,84,38,0.25)", glowDisc: "rgba(218,84,38,0.15)",
    fontDisplay: "'Syne', system-ui, sans-serif",
    fontSans: "'Inter', system-ui, sans-serif",
    neuralFilter: "hue-rotate(-30deg) saturate(1.8) brightness(1.15) contrast(1.1)",
    particleColors: [[218,84,38],[242,177,59],[136,64,131],[240,240,240],[255,160,80]],
  },
  {
    gold: "#C9A84C", amber: "#E8D49A", ice: "#C9A84C", magenta: "#A8863A",
    glow: "rgba(201,168,76,0.12)", glowStrong: "rgba(201,168,76,0.25)", glowDisc: "rgba(201,168,76,0.18)",
    fontDisplay: "'Playfair Display', 'Times New Roman', serif",
    fontSans: "'Inter', system-ui, sans-serif",
    neuralFilter: "hue-rotate(85deg) saturate(1.6) brightness(1.2) contrast(1.05)",
    particleColors: [[201,168,76],[232,212,154],[168,134,58],[245,240,232],[180,155,90]],
  },
  {
    gold: "#7B2D8E", amber: "#C13584", ice: "#10b981", magenta: "#C13584",
    glow: "rgba(123,45,142,0.12)", glowStrong: "rgba(123,45,142,0.25)", glowDisc: "rgba(123,45,142,0.18)",
    fontDisplay: "'IBM Plex Sans', system-ui, sans-serif",
    fontSans: "'IBM Plex Sans', system-ui, sans-serif",
    neuralFilter: "hue-rotate(60deg) saturate(2) brightness(1.1) contrast(1.15)",
    particleColors: [[123,45,142],[193,53,132],[16,185,129],[240,240,243],[59,130,246]],
  },
];

/** Chatbot : prenom + note + 10 questions + contact + devis */
export const CHAT_FLOW = [
  { id: "name", bot: "Bienvenue dans l'univers Scory ! Comment vous appelez-vous ?", freeText: true, placeholder: "Votre prenom...", next: "rate" },
  { id: "rate", bot: "", botTemplate: "Enchante {name} ! Avant de commencer, que pensez-vous de ce portfolio ? Notez-le !", options: [
    { label: "1 — Bof", next: "q1" }, { label: "2 — Correct", next: "q1" }, { label: "3 — Bien", next: "q1" },
    { label: "4 — Tres bien", next: "q1" }, { label: "5 — Incroyable !", next: "q1" },
  ]},
  { id: "q1", bot: "", botTemplate: "Merci {name} ! Passons a votre projet. Quel type de site avez-vous en tete ?", options: [
    { label: "Site vitrine", next: "q2", cost: 800 }, { label: "Landing page", next: "q2", cost: 500 },
    { label: "E-commerce", next: "q2", cost: 3000 }, { label: "SaaS / App web", next: "q2", cost: 5000 },
    { label: "Portfolio creatif", next: "q2", cost: 1200 }, { label: "Blog / Media", next: "q2", cost: 1000 },
    { label: "Application mobile", next: "q2", cost: 6000 }, { label: "Projet sur-mesure", next: "q2", cost: 4000 },
  ]},
  { id: "q2", bot: "Excellent choix ! Que voulez-vous qu'on ressente en regardant votre site ?", options: [
    { label: "Luxe & Premium", next: "q3", cost: 800 }, { label: "Moderne & High-Tech", next: "q3", cost: 500 },
    { label: "Chaleureux & Authentique", next: "q3", cost: 300 }, { label: "Minimaliste & Epure", next: "q3", cost: 200 },
    { label: "Creatif & Artistique", next: "q3", cost: 700 }, { label: "Corporate & Serieux", next: "q3", cost: 300 },
    { label: "Fun & Dynamique", next: "q3", cost: 500 }, { label: "Nature & Eco-responsable", next: "q3", cost: 350 },
  ]},
  { id: "q3", bot: "Tres bien ! Combien de pages souhaitez-vous ?", options: [
    { label: "One page", next: "q4", cost: 0 }, { label: "2-3 pages", next: "q4", cost: 200 },
    { label: "4-6 pages", next: "q4", cost: 500 }, { label: "7-10 pages", next: "q4", cost: 900 },
    { label: "11-20 pages", next: "q4", cost: 1500 }, { label: "20+ pages", next: "q4", cost: 2500 },
    { label: "Je ne sais pas encore", next: "q4", cost: 500 },
  ]},
  { id: "q4", bot: "Et cote design, quel niveau attendez-vous ?", options: [
    { label: "Template adapte", next: "q5", cost: 0 }, { label: "Semi-personnalise", next: "q5", cost: 500 },
    { label: "Design 100 % sur-mesure", next: "q5", cost: 1500 }, { label: "Direction artistique complete", next: "q5", cost: 2200 },
    { label: "Motion design integre", next: "q5", cost: 1800 }, { label: "3D / Experience immersive", next: "q5", cost: 2800 },
    { label: "J'ai deja une maquette", next: "q5", cost: 100 }, { label: "Je ne sais pas", next: "q5", cost: 600 },
  ]},
  { id: "q5", bot: "Quelle fonctionnalite est la plus importante pour vous ?", options: [
    { label: "Formulaire de contact", next: "q6", cost: 100 }, { label: "Blog integre", next: "q6", cost: 400 },
    { label: "Paiement en ligne", next: "q6", cost: 800 }, { label: "Espace membre / Login", next: "q6", cost: 1000 },
    { label: "Reservation / Calendrier", next: "q6", cost: 700 }, { label: "Chat en direct", next: "q6", cost: 500 },
    { label: "Dashboard / Back-office", next: "q6", cost: 1200 }, { label: "Multi-langue", next: "q6", cost: 600 },
  ]},
  { id: "q6", bot: "Pour le contenu du site, qui s'en charge ?", options: [
    { label: "Je fournis tout", next: "q7", cost: 0 }, { label: "Redaction des textes incluse", next: "q7", cost: 500 },
    { label: "Shooting photo pro", next: "q7", cost: 600 }, { label: "Video / Motion incluse", next: "q7", cost: 900 },
    { label: "Illustrations sur-mesure", next: "q7", cost: 700 }, { label: "Optimisation SEO incluse", next: "q7", cost: 400 },
    { label: "Je ne sais pas encore", next: "q7", cost: 300 },
  ]},
  { id: "q7", bot: "Parlons animations ! Quel niveau souhaitez-vous ?", options: [
    { label: "Aucune, sobre et efficace", next: "q8", cost: 0 }, { label: "Subtiles (hover, fades)", next: "q8", cost: 200 },
    { label: "Moderees (scroll, parallax)", next: "q8", cost: 500 }, { label: "Avancees (GSAP, timelines)", next: "q8", cost: 1000 },
    { label: "Immersives (Three.js, WebGL)", next: "q8", cost: 2200 }, { label: "Micro-interactions poussees", next: "q8", cost: 700 },
    { label: "Curseur personnalise", next: "q8", cost: 300 }, { label: "Maximum de wow-effect !", next: "q8", cost: 1500 },
  ]},
  { id: "q8", bot: "Sur quels appareils votre site doit-il etre parfait ?", options: [
    { label: "Desktop uniquement", next: "q9", cost: 0 }, { label: "Mobile first", next: "q9", cost: 200 },
    { label: "Responsive classique", next: "q9", cost: 300 }, { label: "Tablette aussi", next: "q9", cost: 400 },
    { label: "PWA (installable)", next: "q9", cost: 800 }, { label: "App native en plus", next: "q9", cost: 3000 },
    { label: "Tous les ecrans", next: "q9", cost: 500 },
  ]},
  { id: "q9", bot: "Quel suivi souhaitez-vous apres la livraison ?", options: [
    { label: "Aucun, je gere seul", next: "q10", cost: 0 }, { label: "Corrections ponctuelles", next: "q10", cost: 150 },
    { label: "Mises a jour mensuelles", next: "q10", cost: 350 }, { label: "Support prioritaire 7j/7", next: "q10", cost: 600 },
    { label: "Formation a l'outil", next: "q10", cost: 400 }, { label: "Hebergement & domaine inclus", next: "q10", cost: 250 },
    { label: "Analytics & rapports", next: "q10", cost: 400 }, { label: "Pack tout inclus", next: "q10", cost: 900 },
  ]},
  { id: "q10", bot: "Derniere question ! Quel est votre delai ideal ?", options: [
    { label: "Urgence absolue", next: "contact", multiplier: 1.5 }, { label: "Moins d'une semaine", next: "contact", multiplier: 1.4 },
    { label: "2 semaines", next: "contact", multiplier: 1.2 }, { label: "1 mois", next: "contact", multiplier: 1.0 },
    { label: "2-3 mois", next: "contact", multiplier: 0.95 }, { label: "Pas presse du tout", next: "contact", multiplier: 0.9 },
    { label: "A definir ensemble", next: "contact", multiplier: 1.0 }, { label: "Flexible", next: "contact", multiplier: 0.95 },
  ]},
  { id: "contact", bot: "", botTemplate: "Parfait {name} ! Laissez-moi votre email pour recevoir votre devis personnalise :", freeText: true, placeholder: "votre@email.com", next: "done" },
  { id: "done", bot: "", options: [] },
];
