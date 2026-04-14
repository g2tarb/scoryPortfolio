/**
 * SCORY — Nebuleuse FBM (Flaynn)
 * Three.js GLSL : bruit FBM + domain warping, palette Flaynn.
 * Copie du fond original flaynn_saas/public/js/three-neural.js.
 */
import * as THREE from "three";

export class FlaynnNebula {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement("canvas");
    this.canvas.classList.add("project-bg-canvas");
    this.container.appendChild(this.canvas);

    // Orbe hero (copie du hero-orbit de flaynn.tech)
    this.orb = document.createElement("div");
    this.orb.className = "flaynn-orbit";
    this.orb.innerHTML = `<span class="flaynn-orbit__ring flaynn-orbit__ring--outer"></span><span class="flaynn-orbit__ring flaynn-orbit__ring--inner"></span><span class="flaynn-orbit__core"></span>`;
    this.container.appendChild(this.orb);
    this._running = false;
    this._raf = 0;
    this._mouse = { x:0, y:0, tx:0, ty:0 };

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas, alpha: true, antialias: false,
      powerPreference: "low-power", stencil: false, depth: false,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    this.camera.position.z = 40;

    this.uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uResolution: { value: new THREE.Vector2(1, 1) },
    };

    const vs = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;

    const fs = `
      varying vec2 vUv;
      uniform float uTime;
      uniform vec2 uMouse;
      uniform vec2 uResolution;

      float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise2(vec2 p){
        vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);
        return mix(mix(hash21(i),hash21(i+vec2(1,0)),u.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),u.x),u.y);
      }
      float fbm(vec2 p){
        float v=0.0,a=0.5; mat2 m=mat2(1.6,1.2,-1.2,1.6);
        v+=a*noise2(p);p=m*p;a*=0.5;
        v+=a*noise2(p);p=m*p;a*=0.5;
        v+=a*noise2(p);p=m*p;a*=0.5;
        v+=a*noise2(p);return v;
      }

      void main(){
        float t=uTime;
        vec2 asp=vec2(uResolution.x/max(uResolution.y,1.0),1.0);
        vec2 p=(vUv-0.5)*asp*2.8+uMouse*0.22;
        float tf=t*0.11;

        vec2 q=vec2(fbm(p+vec2(tf*0.7,tf*0.5)),fbm(p+vec2(-tf*0.4,tf*0.8)));
        vec2 r=p+(q-0.5)*2.1;

        float n1=fbm(r+vec2(tf*1.2,-tf*0.6));
        float n2=fbm(r*1.65+vec2(tf*2.0,tf*1.1));
        float n3=fbm(r*2.4+vec2(-tf*1.5,tf*2.2));

        float veil=smoothstep(0.28,0.92,n1*0.55+n2*0.35+n3*0.18);
        float wisp=smoothstep(0.45,0.98,n2*n3);

        vec3 cV=vec3(0.545,0.361,0.965);
        vec3 cE=vec3(0.063,0.725,0.506);
        vec3 cA=vec3(0.961,0.620,0.043);
        vec3 cC=vec3(0.231,0.510,0.965);
        vec3 c0=vec3(0.012,0.016,0.027);

        vec3 col=mix(c0,cV,n1*0.55);
        col=mix(col,cE,n2*veil*0.65);
        col=mix(col,cC,wisp*0.45+n3*0.25);
        col=mix(col,cA,smoothstep(0.5,1.0,n2*n1)*0.35);

        float curtain=smoothstep(0.0,0.85,1.0-abs(vUv.y-0.45)*1.8);
        col*=0.35+curtain*0.65;
        float intensity=(0.15+veil*0.55+wisp*0.35)*(0.55+curtain*0.45);

        vec3 rgb=col*intensity;
        float alpha=min(length(rgb)*0.7,1.0);
        gl_FragColor=vec4(rgb,alpha);
      }
    `;

    this.material = new THREE.ShaderMaterial({
      vertexShader: vs, fragmentShader: fs, uniforms: this.uniforms,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
    });
    const geo = new THREE.PlaneGeometry(1, 1);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.scene.add(this.mesh);

    this._onMouse = (e) => { this._mouse.tx = e.clientX/innerWidth-.5; this._mouse.ty = e.clientY/innerHeight-.5; };
    this._onResize = () => this.resize();
    window.addEventListener("resize", this._onResize, { passive: true });
    document.addEventListener("mousemove", this._onMouse, { passive: true });

    /* SECURITY/RESILIENCE: WebGL context loss protection */
    this._onContextLost = (e) => {
      e.preventDefault();
      this.stop();
      console.warn("[SCORY] WebGL context lost on FlaynnNebula — will attempt restore");
      setTimeout(() => {
        try { this.renderer.forceContextRestore(); }
        catch { /* browser may not support forceContextRestore */ }
      }, 2000);
    };
    this._onContextRestored = () => {
      console.info("[SCORY] WebGL context restored on FlaynnNebula");
      this.resize();
      this.start();
    };
    this.canvas.addEventListener("webglcontextlost", this._onContextLost);
    this.canvas.addEventListener("webglcontextrestored", this._onContextRestored);

    this._clock = new THREE.Clock();
    this.resize();
  }

  resize() {
    const w = this.container.clientWidth || innerWidth, h = Math.max(this.container.clientHeight, 1);
    this.camera.aspect = w/h; this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.uniforms.uResolution.value.set(w, h);
    const dist=this.camera.position.z, vFov=this.camera.fov*Math.PI/180;
    const hh=Math.tan(vFov/2)*dist, hw=hh*this.camera.aspect;
    this.mesh.scale.set(hw*2*1.15, hh*2*1.15, 1);
  }
  start() { if(this._running)return; this._running=true; this._clock.getDelta(); this.resize(); this._tick(); }
  stop()  { this._running=false; cancelAnimationFrame(this._raf); }

  _tick() {
    if (!this._running) return;
    this._raf = requestAnimationFrame(() => this._tick());
    this.uniforms.uTime.value += this._clock.getDelta();
    this._mouse.x+=(this._mouse.tx-this._mouse.x)*.06;
    this._mouse.y+=(this._mouse.ty-this._mouse.y)*.06;
    this.uniforms.uMouse.value.set(this._mouse.x*2, -this._mouse.y*2);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.stop();
    window.removeEventListener("resize", this._onResize);
    document.removeEventListener("mousemove", this._onMouse);
    this.canvas.removeEventListener("webglcontextlost", this._onContextLost);
    this.canvas.removeEventListener("webglcontextrestored", this._onContextRestored);
    this.mesh.geometry.dispose(); this.material.dispose(); this.renderer.dispose();
    if (this.canvas.parentNode) this.canvas.remove();
    if (this.orb.parentNode) this.orb.remove();
  }
}
