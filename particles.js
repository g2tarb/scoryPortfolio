/**
 * SCORY — particles.js
 * Système de particules 2D pour la transition entre disques.
 * Le disque courant éclate en particules dans la direction de la flèche,
 * puis un nouveau disque se reforme depuis le côté opposé.
 */
export class ParticleTransition {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this._raf = 0;
    this._colors = [
      [201, 169, 98], [158, 200, 255], [192, 132, 252],
      [232, 184, 109], [245, 242, 255], [110, 231, 183],
    ];
    this.resize();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /** Change la palette de couleurs (appelé par applyTheme) */
  setColors(colors) {
    if (Array.isArray(colors) && colors.length > 0) {
      this._colors = colors;
    }
  }

  /** Génère des particules disposées en cercle plein */
  _makeParticles(cx, cy, radius, count = 300) {
    const colors = this._colors;
    const out = [];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      out.push({
        homeX: cx + Math.cos(a) * r,
        homeY: cy + Math.sin(a) * r,
        x: 0,
        y: 0,
        size: 1 + Math.random() * 2.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0,
        speed: 2 + Math.random() * 7,
      });
    }
    return out;
  }

  /**
   * Lance la transition particules complète.
   * @param {DOMRect} rect — bounding rect du disque actif
   * @param {1|-1} direction — 1 = vers la droite, -1 = vers la gauche
   * @returns {Promise<void>} résout quand la transition est terminée
   */
  transition(rect, direction) {
    cancelAnimationFrame(this._raf);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const radius = rect.width / 2;

    /* --- Particules de dispersion (disque qui éclate) --- */
    const scatter = this._makeParticles(cx, cy, radius);
    for (const p of scatter) {
      p.x = p.homeX;
      p.y = p.homeY;
      p.alpha = 0.55 + Math.random() * 0.45;
      p.vx = direction * p.speed + (Math.random() - 0.5) * 2;
      p.vy = (Math.random() - 0.5) * 5;
    }

    /* --- Particules de reformation (nouveau disque) --- */
    const reform = this._makeParticles(cx, cy, radius);
    const offset = -direction * (window.innerWidth * 0.55 + radius);
    for (const p of reform) {
      p.x = p.homeX + offset;
      p.y = p.homeY + (Math.random() - 0.5) * 200;
      p.alpha = 0;
      p.delay = 8 + Math.random() * 14;
    }

    return new Promise((resolve) => {
      let frame = 0;
      const total = 78;

      const loop = () => {
        frame++;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        /* Dispersion */
        for (const p of scatter) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += (Math.random() - 0.5) * 0.35;
          p.alpha *= 0.955;
          if (p.alpha < 0.01) continue;
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          this.ctx.fillStyle = `rgba(${p.color[0]},${p.color[1]},${p.color[2]},${p.alpha})`;
          this.ctx.fill();
        }

        /* Reformation */
        for (const p of reform) {
          if (frame < p.delay) continue;
          p.x += (p.homeX - p.x) * 0.088;
          p.y += (p.homeY - p.y) * 0.088;
          const t = (frame - p.delay) / (total - p.delay);
          p.alpha = Math.min(0.82, Math.pow(Math.min(t, 1), 0.45) * 1.1);
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          this.ctx.fillStyle = `rgba(${p.color[0]},${p.color[1]},${p.color[2]},${p.alpha})`;
          this.ctx.fill();
        }

        if (frame < total) {
          this._raf = requestAnimationFrame(loop);
        } else {
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          resolve();
        }
      };

      this._raf = requestAnimationFrame(loop);
    });
  }
}
