/**
 * SCORY — Universe Background (4dayvelopment)
 * Three.js : etoiles + nebuleuse marque + noeuds neuraux + connexions.
 * Copie du fond original projetClaude/public/js/modules/three-bg.js.
 */
import * as THREE from "three";

export class UniverseBackground {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement("canvas");
    this.canvas.classList.add("project-bg-canvas");
    this.container.appendChild(this.canvas);
    this._running = false;
    this._raf = 0;
    this._frame = 0;
    this._mx = 0; this._my = 0;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas, alpha: true, antialias: false, powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 2000);
    this.camera.position.z = 380;
    this._build();
    this._onMouse = (e) => {
      this._mx = (e.clientX / innerWidth - .5) * 2;
      this._my = (e.clientY / innerHeight - .5) * 2;
    };
    this._onResize = () => this.resize();
    window.addEventListener("resize", this._onResize, { passive: true });
    document.addEventListener("mousemove", this._onMouse, { passive: true });

    /* SECURITY/RESILIENCE: WebGL context loss protection */
    this._onContextLost = (e) => {
      e.preventDefault();
      this.stop();
      console.warn("[SCORY] WebGL context lost on Universe — will attempt restore");
      setTimeout(() => {
        try { this.renderer.forceContextRestore(); }
        catch { /* browser may not support forceContextRestore */ }
      }, 2000);
    };
    this._onContextRestored = () => {
      console.info("[SCORY] WebGL context restored on Universe");
      this._build();
      this.resize();
      this.start();
    };
    this.canvas.addEventListener("webglcontextlost", this._onContextLost);
    this.canvas.addEventListener("webglcontextrestored", this._onContextRestored);

    this.resize();
  }

  _build() {
    const pal = [new THREE.Color("#DA5426"), new THREE.Color("#f2b13b"),
                 new THREE.Color("#884083"), new THREE.Color("#e07040")];

    // Etoiles
    const sc = 800, sp = new Float32Array(sc * 3);
    for (let i = 0; i < sc; i++) { sp[i*3]=(Math.random()-.5)*3200; sp[i*3+1]=(Math.random()-.5)*3200; sp[i*3+2]=(Math.random()-.5)*3200; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color:0xffffff, size:1, transparent:true, opacity:.5, sizeAttenuation:true }));
    this.scene.add(this.stars);

    // Nebuleuse
    const nc = 250, np = new Float32Array(nc*3), ncol = new Float32Array(nc*3);
    for (let i = 0; i < nc; i++) {
      const r = 300+Math.random()*550, th=Math.random()*Math.PI*2, ph=Math.acos(2*Math.random()-1);
      np[i*3]=r*Math.sin(ph)*Math.cos(th); np[i*3+1]=r*Math.sin(ph)*Math.sin(th); np[i*3+2]=(Math.random()-.5)*380;
      const c = pal[Math.floor(Math.random()*pal.length)];
      ncol[i*3]=c.r; ncol[i*3+1]=c.g; ncol[i*3+2]=c.b;
    }
    const ng = new THREE.BufferGeometry(); ng.setAttribute("position", new THREE.BufferAttribute(np, 3));
    ng.setAttribute("color", new THREE.BufferAttribute(ncol, 3));
    this._nebMat = new THREE.PointsMaterial({ size:3.5, vertexColors:true, transparent:true, opacity:.3, blending:THREE.AdditiveBlending, depthWrite:false });
    this.nebula = new THREE.Points(ng, this._nebMat);
    this.scene.add(this.nebula);

    // Noeuds neuraux
    const nn = 45; this._nn = nn;
    const ndp = new Float32Array(nn*3); this._nv = [];
    for (let i = 0; i < nn; i++) {
      ndp[i*3]=(Math.random()-.5)*850; ndp[i*3+1]=(Math.random()-.5)*560; ndp[i*3+2]=(Math.random()-.5)*200;
      this._nv.push({ x:(Math.random()-.5)*.28, y:(Math.random()-.5)*.28, z:(Math.random()-.5)*.08 });
    }
    const ndg = new THREE.BufferGeometry(); ndg.setAttribute("position", new THREE.BufferAttribute(ndp, 3));
    this._nodeMat = new THREE.PointsMaterial({ color:0xf2b13b, size:3.5, transparent:true, opacity:.75, blending:THREE.AdditiveBlending, depthWrite:false });
    this.nodes = new THREE.Points(ndg, this._nodeMat);
    this.scene.add(this.nodes);

    // Connexions
    const ml = nn*nn; this._lp = new Float32Array(ml*6);
    const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.BufferAttribute(this._lp, 3));
    this._lineMat = new THREE.LineBasicMaterial({ color:0xf2b13b, transparent:true, opacity:.12, blending:THREE.AdditiveBlending, depthWrite:false });
    this.lines = new THREE.LineSegments(lg, this._lineMat);
    this.scene.add(this.lines);
    this._md = 155; this._lt = 0;
  }

  resize() {
    const w = this.container.clientWidth || innerWidth, h = Math.max(this.container.clientHeight, 1);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }
  start() { if (this._running) return; this._running = true; this.resize(); this._tick(); }
  stop()  { this._running = false; cancelAnimationFrame(this._raf); }

  _tick() {
    if (!this._running) return;
    this._raf = requestAnimationFrame(() => this._tick());
    this._frame++;
    const t = this._frame * .006, nn = this._nn;
    const pos = this.nodes.geometry.attributes.position.array;
    for (let i = 0; i < nn; i++) {
      pos[i*3]+=this._nv[i].x; pos[i*3+1]+=this._nv[i].y; pos[i*3+2]+=this._nv[i].z;
      if (Math.abs(pos[i*3])>440) this._nv[i].x*=-1;
      if (Math.abs(pos[i*3+1])>295) this._nv[i].y*=-1;
      if (Math.abs(pos[i*3+2])>115) this._nv[i].z*=-1;
    }
    this.nodes.geometry.attributes.position.needsUpdate = true;
    if (++this._lt % 20 === 0) {
      let c = 0;
      for (let i = 0; i < nn; i++) for (let j = i+1; j < nn; j++) {
        const dx=pos[i*3]-pos[j*3],dy=pos[i*3+1]-pos[j*3+1],dz=pos[i*3+2]-pos[j*3+2];
        if (dx*dx+dy*dy+dz*dz < this._md*this._md) {
          const b=c*6; this._lp[b]=pos[i*3];this._lp[b+1]=pos[i*3+1];this._lp[b+2]=pos[i*3+2];
          this._lp[b+3]=pos[j*3];this._lp[b+4]=pos[j*3+1];this._lp[b+5]=pos[j*3+2]; c++;
        }
      }
      this.lines.geometry.setDrawRange(0,c*2);
      this.lines.geometry.attributes.position.needsUpdate = true;
    }
    this.stars.rotation.y=t*.035; this.stars.rotation.x=t*.015;
    this.nebula.rotation.y=t*.055; this.nebula.rotation.z=t*.025;
    this.nodes.rotation.y=t*.012;
    this.camera.position.x+=(this._mx*28-this.camera.position.x)*.02;
    this.camera.position.y+=(-this._my*18-this.camera.position.y)*.02;
    this.camera.lookAt(this.scene.position);
    const p=(t*.25)%(Math.PI*2),w1=Math.max(0,Math.cos(p)),w2=Math.max(0,Math.cos(p-Math.PI*2/3)),w3=Math.max(0,Math.cos(p-Math.PI*4/3)),tot=w1+w2+w3||1;
    const cr=(0xDA/255*w1+0x7B/255*w2+0xFF/255*w3)/tot, cg=(0x54/255*w1+0x2F/255*w2+0xD7/255*w3)/tot, cb=(0x26/255*w1+0xBE/255*w2+0x00/255*w3)/tot;
    this._nodeMat.color.setRGB(cr,cg,cb); this._lineMat.color.setRGB(cr,cg,cb);
    this._nebMat.opacity=.22+Math.sin(t*.9)*.08;
    this._nodeMat.opacity=.55+Math.sin(t*1.3)*.2;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.stop();
    window.removeEventListener("resize", this._onResize);
    document.removeEventListener("mousemove", this._onMouse);
    this.canvas.removeEventListener("webglcontextlost", this._onContextLost);
    this.canvas.removeEventListener("webglcontextrestored", this._onContextRestored);
    this.scene.traverse(o => { if(o.geometry)o.geometry.dispose(); if(o.material)o.material.dispose(); });
    this.renderer.dispose(); if (this.canvas.parentNode) this.canvas.remove();
  }
}
