import * as THREE from "three";

/**
 * Calque plein écran « reflet sur l’eau » : texture projet + distorsion UV type lac.
 * Uniformes : uTexture, uTime, uProgress (intensité des vagues), uResolution.
 */
export class WaterReflectionLayer {
  /**
   * @param {HTMLElement} container
   * @param {{ canvas?: HTMLCanvasElement; timeScale?: number }} [opts]
   */
  constructor(container, opts = {}) {
    this.container = container;
    this.canvas = opts.canvas ?? document.createElement("canvas");
    this.canvas.classList.add("water-canvas");
    if (!this.canvas.parentNode) {
      this.container.prepend(this.canvas);
    }

    const placeholder = new THREE.DataTexture(new Uint8Array([12, 10, 18, 255]), 1, 1);
    placeholder.needsUpdate = true;
    placeholder.colorSpace = THREE.SRGBColorSpace;

    this.uniforms = {
      uTexture: { value: placeholder },
      uTime: { value: 0 },
      /** 0 = eau calme, 1 = forte distorsion (éclaboussure au changement de projet) */
      uProgress: { value: 0.14 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      /** Dimensions texture (px) — pour cadrage « contain » sans crop agressif */
      uTextureSize: { value: new THREE.Vector2(1, 1) },
      /** < 1 = dézoom supplémentaire après le contain (respiration autour de l’image) */
      uFrameZoom: { value: 1.0 },
      /** Facteur de fondu des vagues : 1 = plein effet, 0 = image nette */
      uFade: { value: 1.0 },
    };

    this._clock = new THREE.Clock();
    this._timeScale = typeof opts.timeScale === "number" ? opts.timeScale : 1;
    this._running = true;
    this._raf = 0;
    this._currentUrl = null;
    /** Durée de l'animation avant gel (secondes) */
    this._animDuration = 3;
    this._animElapsed = 0;
    this._frozen = false;
    this._loader = new THREE.TextureLoader();
    this._loader.setCrossOrigin("anonymous");

    this._buildScene();
    this.resize();
    window.addEventListener("resize", this._onResize);

    /* SECURITY/RESILIENCE: WebGL context loss protection.
     * Mobile devices and resource-constrained environments may lose the
     * WebGL context. Without handling, the canvas goes black permanently. */
    this._onContextLost = (e) => {
      e.preventDefault();
      this._running = false;
      cancelAnimationFrame(this._raf);
      console.warn("[SCORY] WebGL context lost on WaterReflection — will attempt restore");
      setTimeout(() => {
        try { this.renderer.forceContextRestore(); }
        catch { /* browser may not support forceContextRestore */ }
      }, 2000);
    };
    this._onContextRestored = () => {
      console.info("[SCORY] WebGL context restored on WaterReflection");
      this._buildScene();
      this.resize();
      this._tick();
    };
    this.canvas.addEventListener("webglcontextlost", this._onContextLost);
    this.canvas.addEventListener("webglcontextrestored", this._onContextRestored);

    this._tick();
  }

  _buildScene() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    const aspect = this.container.clientWidth / Math.max(this.container.clientHeight, 1);
    this.camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 100);
    this.camera.position.z = 2.75;

    this.scene = new THREE.Scene();

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform sampler2D uTexture;
      uniform float uTime;
      uniform float uProgress;
      uniform vec2 uResolution;
      uniform vec2 uTextureSize;
      uniform float uFrameZoom;
      uniform float uFade;
      varying vec2 vUv;

      /* object-fit: contain — toute l’image visible, bandes sombres (évite le crop type « zoom ») */
      vec2 containUv(vec2 st) {
        float Rc = uResolution.x / max(uResolution.y, 1.0);
        float Ri = uTextureSize.x / max(uTextureSize.y, 0.0001);
        vec2 u = st;
        if (Rc > Ri) {
          float s = Ri / Rc;
          u.x = (u.x - 0.5) * s + 0.5;
        } else {
          float s = Rc / Ri;
          u.y = (u.y - 0.5) * s + 0.5;
        }
        u = (u - 0.5) * uFrameZoom + 0.5;
        return u;
      }

      void main() {
        vec2 uvBase = containUv(vUv);
        float pr = clamp(uProgress, 0.0, 1.2);
        float t = uTime;

        float fade = clamp(uFade, 0.0, 1.0);

        vec2 wave = vec2(
          sin(uvBase.y * 22.0 + t * 1.9) * cos(uvBase.x * 16.0 - t * 1.15),
          cos(uvBase.x * 19.0 - t * 1.35) * sin(uvBase.y * 17.0 + t * 1.05)
        ) * (0.01 + pr * 0.062) * fade;

        vec2 ripple = vec2(
          sin(t * 3.4 + uvBase.x * 48.0),
          cos(t * 2.9 + uvBase.y * 44.0)
        ) * (0.0035 + pr * 0.028) * fade;

        vec2 uv2 = uvBase + wave + ripple;
        vec2 uvClamped = clamp(uv2, vec2(0.001), vec2(0.999));

        vec4 tex = texture2D(uTexture, uvClamped);
        float inside = step(0.0, uv2.x) * step(uv2.x, 1.0) * step(0.0, uv2.y) * step(uv2.y, 1.0);

        vec3 col = tex.rgb * inside + vec3(0.03, 0.028, 0.045) * (1.0 - inside);
        col = pow(max(col, vec3(0.001)), vec3(1.06));
        col *= 0.58;
        col *= vec3(0.82, 0.88, 1.06);
        col += vec3(0.018, 0.022, 0.045);

        vec2 q = vUv - 0.5;
        float vig = 1.0 - dot(q, q) * 1.05;
        vig = smoothstep(0.2, 1.0, vig);
        col *= mix(0.72, 1.0, vig);

        float scan = sin(uvBase.y * uResolution.y * 0.25 + t * 2.0) * 0.012 * pr * fade;
        col += vec3(scan * 0.15);

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const geo = new THREE.PlaneGeometry(6.2, 6.2);
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      transparent: false,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.scene.add(this.mesh);
  }

  _onResize = () => this.resize();

  resize() {
    const w = this.container.clientWidth;
    const h = Math.max(this.container.clientHeight, 1);
    this.uniforms.uResolution.value.set(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    // Ajuster le plan pour couvrir le frustum caméra (évite le zoom excessif)
    const vFov = this.camera.fov * Math.PI / 180;
    const frustumH = 2 * Math.tan(vFov / 2) * this.camera.position.z;
    const frustumW = frustumH * this.camera.aspect;
    this.mesh.scale.set(frustumW / 6.2, frustumH / 6.2, 1);
  }

  /**
   * @param {number} v — intensité de distorsion (pics au changement de vinyle)
   */
  setProgress(v) {
    this.uniforms.uProgress.value = THREE.MathUtils.clamp(v, 0, 1.2);
  }

  getProgress() {
    return this.uniforms.uProgress.value;
  }

  /**
   * Réglage fin du cadrage après contain (ex. 0.92 = un peu plus d’air autour de l’image).
   * @param {number} z typiquement 0.82–0.95
   */
  setFrameZoom(z) {
    this.uniforms.uFrameZoom.value = THREE.MathUtils.clamp(z, 0.65, 1.0);
  }

  /**
   * Charge une capture d’écran (URL). Résout quand la texture est prête.
   * @param {string} url
   * @returns {Promise<void>}
   */
  loadTexture(url) {
    if (!url || typeof url !== "string") {
      return Promise.reject(new Error("WaterReflectionLayer: URL invalide"));
    }
    if (url === this._currentUrl && this.uniforms.uTexture.value?.image) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this._loader.load(
        url,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.generateMipmaps = true;
          const img = tex.image;
          const iw = img?.width || 1;
          const ih = img?.height || 1;
          this.uniforms.uTextureSize.value.set(iw, ih);
          this.uniforms.uTexture.value = tex;
          this._currentUrl = url;
          this._restartAnim();
          resolve();
        },
        undefined,
        (err) => reject(err || new Error("Échec chargement texture"))
      );
    });
  }

  /** Relance 3 s d'animation (appelé au changement de texture) */
  _restartAnim() {
    this._animElapsed = 0;
    this._frozen = false;
    this.uniforms.uFade.value = 1.0;
    this._clock.getDelta(); // purge le delta accumulé
    if (this._running) {
      cancelAnimationFrame(this._raf);
      this._raf = requestAnimationFrame(this._tick);
    }
  }

  _tick = () => {
    if (!this._running) return;
    const dt = this._clock.getDelta();

    if (!this._frozen) {
      this._animElapsed += dt;
      this.uniforms.uTime.value += dt * this._timeScale;

      /* Fondu progressif : les vagues s'atténuent sur la durée */
      const t = Math.min(this._animElapsed / this._animDuration, 1);
      /* Courbe ease-in : les vagues restent fortes au début, s'estompent vite à la fin */
      this.uniforms.uFade.value = Math.max(0, 1 - t * t);

      if (t >= 1) {
        this.uniforms.uFade.value = 0;
        this._frozen = true;
      }
    }

    this.renderer.render(this.scene, this.camera);

    /* Si gelé, dernier rendu fait — on arrête la boucle */
    if (this._frozen) return;
    this._raf = requestAnimationFrame(this._tick);
  };

  dispose() {
    this._running = false;
    cancelAnimationFrame(this._raf);
    window.removeEventListener("resize", this._onResize);
    this.canvas.removeEventListener("webglcontextlost", this._onContextLost);
    this.canvas.removeEventListener("webglcontextrestored", this._onContextRestored);
    this.material.dispose();
    this.mesh.geometry.dispose();
    const t = this.uniforms.uTexture.value;
    if (t && t.dispose) t.dispose();
    this.renderer.dispose();
  }
}
