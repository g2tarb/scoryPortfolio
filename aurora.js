/**
 * SCORY — Aurora Borealis (Clara Martinez)
 * Canvas 2D : rubans ondulants + halo souris.
 * Copie du fond original clara-martinez-project.
 */
export class AuroraBorealis {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement("canvas");
    this.canvas.classList.add("project-bg-canvas");
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.t = 0;
    this.mx = 0.5; this.my = 0.38;
    this.tx = 0.5; this.ty = 0.38;
    this._running = false;
    this._raf = 0;
    this.bands = [
      { y:.32, amp:.10, freq:.70, spd:.42, ph:0,             thk:.20, c1:[80,55,180],  c2:[30,160,150] },
      { y:.44, amp:.08, freq:1.05,spd:.30, ph:Math.PI*.8,    thk:.16, c1:[50,90,210],  c2:[130,60,215] },
      { y:.24, amp:.07, freq:.55, spd:.25, ph:Math.PI*1.4,   thk:.13, c1:[201,168,76], c2:[100,55,185] },
      { y:.52, amp:.06, freq:1.30,spd:.55, ph:Math.PI*.4,    thk:.10, c1:[60,110,220], c2:[30,170,155] },
    ];
    this._onMouse = (e) => { this.tx = e.clientX / innerWidth; this.ty = e.clientY / innerHeight; };
    this._onResize = () => this.resize();
    window.addEventListener("resize", this._onResize, { passive: true });
    document.addEventListener("mousemove", this._onMouse, { passive: true });
    this.resize();
  }
  resize() {
    this.canvas.width = this.container.clientWidth || innerWidth;
    this.canvas.height = this.container.clientHeight || innerHeight;
    this.W = this.canvas.width; this.H = this.canvas.height;
  }
  start() { if (this._running) return; this._running = true; this.resize(); this._loop(); }
  stop()  { this._running = false; cancelAnimationFrame(this._raf); }
  _loop() {
    if (!this._running) return;
    this.t += .006;
    const { ctx, W, H } = this;
    this.mx += (this.tx - this.mx) * .032;
    this.my += (this.ty - this.my) * .032;
    ctx.fillStyle = "#08080F";
    ctx.fillRect(0, 0, W, H);
    for (const b of this.bands) this._drawBand(b);
    const gx = this.mx * W, gy = this.my * H * .7, gr = Math.min(W, H) * .5;
    const h = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    h.addColorStop(0, "rgba(201,168,76,.10)");
    h.addColorStop(.4, "rgba(80,55,180,.07)");
    h.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = h; ctx.fillRect(0, 0, W, H);
    this._raf = requestAnimationFrame(() => this._loop());
  }
  _drawBand(b) {
    const { ctx, W, H, t, mx, my } = this;
    const N = 64, step = W / N;
    const yBase = (b.y + (my - .5) * .06) * H, amp = b.amp * H, thk = b.thk * H;
    const ph = (mx - .5) * .45;
    const top = [];
    for (let i = 0; i <= N; i++) {
      const x = i * step;
      const w1 = Math.sin(i * b.freq * .12 + t * b.spd + b.ph + ph);
      const w2 = Math.sin(i * b.freq * .07 + t * b.spd * .6 + b.ph * .5) * .38;
      top.push({ x, y: yBase + (w1 + w2) * amp });
    }
    const bot = top.map((p, i) => ({ x: p.x, y: p.y + thk * (.55 + .45 * Math.sin(i * .19 + t * .48 + b.ph * 1.1)) }));
    ctx.save(); ctx.beginPath(); ctx.moveTo(top[0].x, top[0].y);
    for (let i = 1; i <= N; i++) {
      const mid = { x: (top[i-1].x + top[i].x) / 2, y: (top[i-1].y + top[i].y) / 2 };
      ctx.quadraticCurveTo(top[i-1].x, top[i-1].y, mid.x, mid.y);
    }
    for (let i = N; i >= 0; i--) ctx.lineTo(bot[i].x, bot[i].y);
    ctx.closePath();
    let minY = top[0].y, maxY = bot[0].y;
    for (let i = 1; i <= N; i++) { if (top[i].y < minY) minY = top[i].y; if (bot[i].y > maxY) maxY = bot[i].y; }
    const g = ctx.createLinearGradient(0, minY, 0, maxY);
    const [r1,g1,b1] = b.c1, [r2,g2,b2] = b.c2;
    g.addColorStop(0, `rgba(${r1},${g1},${b1},0)`);
    g.addColorStop(.22, `rgba(${r1},${g1},${b1},.20)`);
    g.addColorStop(.60, `rgba(${r2},${g2},${b2},.16)`);
    g.addColorStop(1, `rgba(${r2},${g2},${b2},0)`);
    ctx.fillStyle = g; ctx.fill(); ctx.restore();
  }
  dispose() {
    this.stop();
    window.removeEventListener("resize", this._onResize);
    document.removeEventListener("mousemove", this._onMouse);
    if (this.canvas.parentNode) this.canvas.remove();
  }
}
