import * as THREE from "three";

/**
 * Fond plein écran type « réseau neural » pour le musée digital.
 * Les uniformes uTime, uTransitionProgress, uRotationInfluence et uLoupeProgress
 * sont pilotés depuis app.js pour lier navigation, drag et loupe au rendu shader.
 */
export class FlaynnNeuralBackground {
  /**
   * @param {HTMLElement} container — parent (ex. #neural-host), dimensions = zone de rendu
   * @param {{ canvas?: HTMLCanvasElement; timeScale?: number }} [opts]
   *        canvas : optionnel ; sinon un <canvas> est créé et inséré en tête du container
   *        timeScale : multiplicateur du temps (ex. 0.22 si prefers-reduced-motion)
   */
  constructor(container, opts = {}) {
    this.container = container;
    this.canvas = opts.canvas ?? document.createElement("canvas");
    this.canvas.classList.add("neural-canvas");
    if (!this.canvas.parentNode) {
      this.container.prepend(this.canvas);
    }

    // Uniforms partagés entre JS et le fragment shader GLSL
    this.uniforms = {
      uTime: { value: 0 }, // temps écoulé → animation continue du motif
      uTransitionProgress: { value: 0 }, // 0–1 pendant un changement de disque (morph)
      uRotationInfluence: { value: 0 }, // intensité liée au drag / vélocité
      uLoupeProgress: { value: 0 }, // 0–1 zoom « expert » + halo central
      uResolution: { value: new THREE.Vector2(1, 1) }, // taille pixels → aspect correct
    };

    this._clock = new THREE.Clock(); // delta temps entre frames
    /** @private Ralentit ou accélère l’écoulement de uTime (accessibilité) */
    this._timeScale = typeof opts.timeScale === "number" ? opts.timeScale : 1;
    this._running = true;
    this._raf = 0;

    this._buildScene();
    this.resize();
    window.addEventListener("resize", this._onResize);
    this._tick(); // boucle requestAnimationFrame
  }

  /** Crée renderer, caméra, plan plein écran avec ShaderMaterial */
  _buildScene() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true, // fond transparent pour laisser voir le CSS derrière si besoin
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    const aspect = this.container.clientWidth / Math.max(this.container.clientHeight, 1);
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 100);
    this.camera.position.z = 2.4; // recul par défaut ; rapproché quand uLoupe augmente

    this.scene = new THREE.Scene();

    // Vertex minimal : passe les UV au fragment
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    // Fragment : bruit + ondes → aspect « filaire / neural », réagit aux uniformes
    const fragmentShader = `
      uniform float uTime;
      uniform float uTransitionProgress;
      uniform float uRotationInfluence;
      uniform float uLoupeProgress;
      uniform vec2 uResolution;
      varying vec2 vUv;

      // Pseudo-aléa déterministe par cellule
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      // Bruit interpolé type Value noise
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      void main() {
        vec2 uv = vUv;
        // Coordonnées centrées avec bon ratio d’aspect
        vec2 p = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);

        // uRotationInfluence accélère légèrement l’écoulement visuel (feedback drag)
        float t = uTime * (0.35 + uRotationInfluence * 0.85);
        // uTransitionProgress fait tourner la phase du motif pendant le carrousel
        float morph = uTransitionProgress * 6.28318;

        float n = noise(p * 3.2 + t * 0.15);
        float flow = sin(p.x * 8.0 + morph + n * 3.0) * cos(p.y * 7.0 - t * 0.4);
        float web = smoothstep(0.15, 0.95, abs(flow) + n * 0.5);

        vec3 c1 = vec3(0.04, 0.03, 0.08);
        vec3 c2 = vec3(0.12, 0.08, 0.18);
        vec3 c3 = vec3(0.35, 0.55, 0.95);
        vec3 c4 = vec3(0.75, 0.55, 0.95);

        float pulse = 0.5 + 0.5 * sin(t * 1.3 + length(p) * 4.0 + morph);
        vec3 col = mix(c1, c2, web);
        col = mix(col, c3, pulse * 0.22 * (0.4 + uTransitionProgress));
        col += c4 * (0.08 + uRotationInfluence * 0.12) * web;

        // Assombrit les bords pour recentrer le regard
        float vignette = 1.0 - dot(p, p) * 0.85;
        vignette = smoothstep(0.0, 1.0, vignette);

        // uLoupeProgress : halo au centre (tunnel / zoom mental)
        float tunnel = smoothstep(0.0, 1.0, uLoupeProgress);
        float centerGlow = exp(-length(p) * (3.0 - tunnel * 1.8));
        col += vec3(0.15, 0.2, 0.35) * centerGlow * tunnel;

        col *= mix(0.55, 1.0, vignette);
        gl_FragColor = vec4(col, 0.92);
      }
    `;

    const geo = new THREE.PlaneGeometry(6, 6);
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false, // évite d’occulter d’autres objets si la scène s’enrichit
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.scene.add(this.mesh);
  }

  _onResize = () => this.resize();

  /** Recalcule taille du canvas, matrice caméra et uResolution */
  resize() {
    const w = this.container.clientWidth;
    const h = Math.max(this.container.clientHeight, 1);
    this.uniforms.uResolution.value.set(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  /**
   * Synchronise le shader avec la navigation carrousel (0 = repos, 1 = fin de transition).
   * @param {number} v
   */
  setTransitionProgress(v) {
    this.uniforms.uTransitionProgress.value = THREE.MathUtils.clamp(v, 0, 1);
  }

  /**
   * Intensité organique liée à la vitesse du geste sur les disques.
   * @param {number} v
   */
  setRotationInfluence(v) {
    this.uniforms.uRotationInfluence.value = THREE.MathUtils.clamp(v, 0, 2);
  }

  /**
   * Mode loupe : shader (halo) + rapprochement caméra + léger avance du plan.
   * @param {number} v 0..1
   */
  setLoupeProgress(v) {
    const p = THREE.MathUtils.clamp(v, 0, 1);
    this.uniforms.uLoupeProgress.value = p;
    const z = THREE.MathUtils.lerp(2.4, 0.95, p);
    this.camera.position.z = z;
    this.mesh.position.z = THREE.MathUtils.lerp(0, 0.15, p);
  }

  /** Lit la valeur courante pour repartir d’un tween GSAP sans saut */
  getLoupeProgress() {
    return this.uniforms.uLoupeProgress.value;
  }

  /** Boucle de rendu : incrémente uTime et dessine la scène */
  _tick = () => {
    if (!this._running) return;
    const dt = this._clock.getDelta();
    this.uniforms.uTime.value += dt * this._timeScale;
    this.renderer.render(this.scene, this.camera);
    this._raf = requestAnimationFrame(this._tick);
  };

  /** Libère GPU et écouteurs (si la page est démontée dynamiquement) */
  dispose() {
    this._running = false;
    cancelAnimationFrame(this._raf);
    window.removeEventListener("resize", this._onResize);
    this.material.dispose();
    this.mesh.geometry.dispose();
    this.renderer.dispose();
  }
}
