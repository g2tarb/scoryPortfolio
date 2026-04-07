/**
 * SCORY — pixel-rain.js
 * Pluie de pixels diagonale (haut-gauche → bas-droite)
 * avec mouvement de drapeau ondulant.
 */

export class PixelRain {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this._raf = 0;
    this._running = false;
    this._particles = [];
    this._t = 0;
    this._colors = [
      [201,169,98], [158,200,255], [192,132,252],
      [232,184,109], [245,242,255], [110,231,183],
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

  /** Change la palette (appele par applyTheme) */
  setColors(colors) {
    if (Array.isArray(colors) && colors.length > 0) this._colors = colors;
  }

  /** Lance la pluie de pixels */
  start() {
    if (this._running) return;
    this._running = true;
    this._t = 0;
    this._spawn();
    this._loop();
    this.canvas.classList.add("is-active");
  }

  stop() {
    this._running = false;
    cancelAnimationFrame(this._raf);
    this.canvas.classList.remove("is-active");
    this.ctx.clearRect(0, 0, this.W, this.H);
    this._particles = [];
  }

  _spawn() {
    this._particles = [];
    const count = Math.min(Math.floor(this.W * this.H / 3000), 250);
    for (let i = 0; i < count; i++) {
      // Depart : reparti le long du bord haut + bord gauche
      const edge = Math.random();
      let startX, startY;
      if (edge < 0.6) {
        // Bord haut (majoritaire)
        startX = Math.random() * this.W * 0.8;
        startY = -Math.random() * this.H * 0.3;
      } else {
        // Bord gauche
        startX = -Math.random() * this.W * 0.2;
        startY = Math.random() * this.H * 0.6;
      }

      const color = this._colors[Math.floor(Math.random() * this._colors.length)];
      const speed = 1.5 + Math.random() * 3;
      const size = 1 + Math.random() * 2.5;

      this._particles.push({
        x: startX,
        y: startY,
        size,
        color,
        speed,
        // Phase pour le mouvement de drapeau
        phase: Math.random() * Math.PI * 2,
        waveAmp: 8 + Math.random() * 20,
        waveFreq: 0.02 + Math.random() * 0.03,
        alpha: 0,
        delay: Math.random() * 60, // frames de delai
        life: 0,
      });
    }
  }

  _loop() {
    if (!this._running) return;
    this._t++;
    const { ctx, W, H, _particles: p, _t: t } = this;

    ctx.clearRect(0, 0, W, H);

    let alive = 0;

    for (let i = 0; i < p.length; i++) {
      const pt = p[i];
      if (t < pt.delay) continue;

      pt.life++;

      // Mouvement diagonal haut-gauche → bas-droite
      pt.x += pt.speed * 0.85;
      pt.y += pt.speed * 0.55;

      // Mouvement drapeau : ondulation perpendiculaire a la diagonale
      const wave = Math.sin(pt.life * pt.waveFreq + pt.phase) * pt.waveAmp;
      // Perpendiculaire a la diagonale (angle ~33deg) : dx=-0.55, dy=0.85
      const drawX = pt.x + wave * -0.55;
      const drawY = pt.y + wave * 0.85;

      // Fade in puis fade out
      if (pt.life < 20) {
        pt.alpha = pt.life / 20;
      } else if (drawX > W * 0.85 || drawY > H * 0.85) {
        pt.alpha *= 0.92;
      }

      if (pt.alpha < 0.01) continue;
      if (drawX > W + 50 || drawY > H + 50) continue;

      alive++;
      ctx.beginPath();
      ctx.arc(drawX, drawY, pt.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${pt.color[0]},${pt.color[1]},${pt.color[2]},${pt.alpha * 0.6})`;
      ctx.fill();
    }

    // Arreter quand toutes les particules ont disparu (apres ~5 secondes)
    if (alive === 0 && t > 100) {
      this.stop();
      return;
    }

    this._raf = requestAnimationFrame(() => this._loop());
  }
}
