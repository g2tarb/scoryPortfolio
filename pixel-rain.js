/**
 * SCORY — pixel-rain.js
 * Les particules volent en diagonale (haut-gauche → bas-droite)
 * avec mouvement de drapeau, puis convergent vers les sections
 * pour les faire apparaitre — les pixels DEVIENNENT le contenu.
 */

export class PixelRain {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this._raf = 0;
    this._running = false;
    this._particles = [];
    this._targets = [];
    this._t = 0;
    this._revealed = new Set();
    this._colors = [
      [201,169,98], [158,200,255], [192,132,252],
      [232,184,109], [245,242,255],
    ];
    this.resize();
    window.addEventListener("resize", () => this.resize(), { passive: true });
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.W = this.canvas.width;
    this.H = this.canvas.height;
  }

  setColors(colors) {
    if (Array.isArray(colors) && colors.length > 0) this._colors = colors;
  }

  /**
   * @param {HTMLElement[]} sections — les elements HTML qui doivent apparaitre depuis les pixels
   */
  start(sections) {
    if (this._running) return;
    this._running = true;
    this._t = 0;
    this._revealed = new Set();
    this._targets = [];
    this._particles = [];

    // Cacher les sections et calculer leurs positions cibles
    sections.forEach((el, i) => {
      el.style.opacity = "0";
      el.style.transform = "scale(0.92)";
      el.style.transition = "none";
      const rect = el.getBoundingClientRect();
      this._targets.push({
        el,
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
        w: rect.width,
        h: rect.height,
        delay: i * 40, // frames de decalage entre sections
        done: false,
      });
    });

    this._spawnParticles();
    this._loop();
    this.canvas.classList.add("is-active");
  }

  stop() {
    this._running = false;
    cancelAnimationFrame(this._raf);
    this.canvas.classList.remove("is-active");
    this.ctx.clearRect(0, 0, this.W, this.H);
    this._particles = [];
    // S'assurer que toutes les sections sont visibles
    this._targets.forEach((t) => {
      t.el.style.opacity = "1";
      t.el.style.transform = "";
      t.el.style.transition = "";
    });
  }

  _spawnParticles() {
    this._targets.forEach((target, tIdx) => {
      // Particules par section (proportionnel a la taille)
      const count = Math.min(Math.floor(target.w * target.h / 2000), 80);

      for (let i = 0; i < count; i++) {
        // Depart : coin haut-gauche + dispersion
        const startX = -50 + Math.random() * this.W * 0.15;
        const startY = -50 + Math.random() * this.H * 0.15;

        // Destination : position random dans le rect de la section
        const destX = target.cx + (Math.random() - 0.5) * target.w * 0.8;
        const destY = target.cy + (Math.random() - 0.5) * target.h * 0.6;

        const color = this._colors[Math.floor(Math.random() * this._colors.length)];
        const speed = 0.015 + Math.random() * 0.015;

        this._particles.push({
          x: startX,
          y: startY,
          destX,
          destY,
          size: 1.5 + Math.random() * 2,
          color,
          speed,
          phase: Math.random() * Math.PI * 2,
          waveAmp: 15 + Math.random() * 30,
          waveFreq: 0.03 + Math.random() * 0.04,
          alpha: 0,
          targetIdx: tIdx,
          delay: target.delay + Math.random() * 25,
          progress: 0, // 0 = depart, 1 = arrive
          arrived: false,
        });
      }
    });
  }

  _loop() {
    if (!this._running) return;
    this._t++;
    const { ctx, W, H, _particles: p, _targets: targets, _t: t } = this;

    ctx.clearRect(0, 0, W, H);

    let activeCount = 0;

    for (let i = 0; i < p.length; i++) {
      const pt = p[i];
      if (t < pt.delay) continue;
      if (pt.arrived) continue;

      activeCount++;

      // Progression vers la destination (easing)
      pt.progress += pt.speed;
      if (pt.progress > 1) pt.progress = 1;

      // Easing ease-out (rapide au debut, ralentit a la fin)
      const ease = 1 - Math.pow(1 - pt.progress, 3);

      // Position interpolee
      const baseX = pt.x + (pt.destX - pt.x) * ease;
      const baseY = pt.y + (pt.destY - pt.y) * ease;

      // Mouvement drapeau (s'attenue en arrivant)
      const flagIntensity = 1 - ease;
      const wave = Math.sin(pt.progress * 12 + pt.phase) * pt.waveAmp * flagIntensity;
      // Perpendiculaire a la diagonale
      const drawX = baseX + wave * -0.5;
      const drawY = baseY + wave * 0.7;

      // Alpha : monte vite, reste, puis fond dans le contenu
      if (pt.progress < 0.15) {
        pt.alpha = pt.progress / 0.15;
      } else if (pt.progress > 0.85) {
        pt.alpha = (1 - pt.progress) / 0.15;
      } else {
        pt.alpha = 1;
      }

      // Particule arrivee
      if (pt.progress >= 1) {
        pt.arrived = true;
        pt.alpha = 0;
        continue;
      }

      // La taille diminue en arrivant (les pixels se condensent)
      const drawSize = pt.size * (0.5 + 0.5 * flagIntensity);

      ctx.beginPath();
      ctx.arc(drawX, drawY, drawSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${pt.color[0]},${pt.color[1]},${pt.color[2]},${pt.alpha * 0.65})`;
      ctx.fill();
    }

    // Verifier quelles sections sont pretes a apparaitre
    for (let tIdx = 0; tIdx < targets.length; tIdx++) {
      if (targets[tIdx].done) continue;

      // Compter les particules arrivees pour cette section
      const total = p.filter((pt) => pt.targetIdx === tIdx).length;
      const arrived = p.filter((pt) => pt.targetIdx === tIdx && pt.arrived).length;

      if (total > 0 && arrived / total > 0.6) {
        // 60% des particules arrivees → reveler la section
        targets[tIdx].done = true;
        const el = targets[tIdx].el;
        el.style.transition = "opacity 0.6s ease, transform 0.6s var(--ease-spring-soft)";
        el.style.opacity = "1";
        el.style.transform = "scale(1)";
        // Nettoyer les styles inline apres la transition
        setTimeout(() => {
          el.style.cssText = "";
        }, 700);
      }
    }

    // Fin : toutes les sections revelees et aucune particule active
    if (targets.every((t) => t.done) && activeCount === 0) {
      this.stop();
      return;
    }

    this._raf = requestAnimationFrame(() => this._loop());
  }
}
