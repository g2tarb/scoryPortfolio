import * as THREE from "three";

/**
 * Fond musée : plan shader atmosphérique + grille 3D (triangles filaires, carrés, petits triangles)
 * animée. Les uniformes restent pilotés par app.js (carrousel, drag, loupe).
 */
export class FlaynnNeuralBackground {
  /**
   * @param {HTMLElement} container
   * @param {{ canvas?: HTMLCanvasElement; timeScale?: number }} [opts]
   */
  constructor(container, opts = {}) {
    this.container = container;
    this.canvas = opts.canvas ?? document.createElement("canvas");
    this.canvas.classList.add("neural-canvas");
    if (!this.canvas.parentNode) {
      this.container.prepend(this.canvas);
    }

    this.uniforms = {
      uTime: { value: 0 },
      uTransitionProgress: { value: 0 },
      uRotationInfluence: { value: 0 },
      uLoupeProgress: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
    };

    this._clock = new THREE.Clock();
    this._timeScale = typeof opts.timeScale === "number" ? opts.timeScale : 1;
    this._running = true;
    this._raf = 0;

    this._buildScene();
    this.resize();
    window.addEventListener("resize", this._onResize);
    this._tick();
  }

  /**
   * Construit la scène : groupe focal (shader + grille animée), caméra perspective.
   */
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
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 100);
    this.camera.position.z = 2.4;

    this.scene = new THREE.Scene();

    // Tout ce qui doit réagir à la loupe (zoom) est sous ce groupe
    this.focalGroup = new THREE.Group();
    this.scene.add(this.focalGroup);

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float uTime;
      uniform float uTransitionProgress;
      uniform float uRotationInfluence;
      uniform float uLoupeProgress;
      uniform vec2 uResolution;
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

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
        vec2 p = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);

        float t = uTime * (0.35 + uRotationInfluence * 0.85);
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

        float vignette = 1.0 - dot(p, p) * 0.85;
        vignette = smoothstep(0.0, 1.0, vignette);

        float tunnel = smoothstep(0.0, 1.0, uLoupeProgress);
        float centerGlow = exp(-length(p) * (3.0 - tunnel * 1.8));
        col += vec3(0.15, 0.2, 0.35) * centerGlow * tunnel;

        col *= mix(0.55, 1.0, vignette);
        gl_FragColor = vec4(col, 0.88);
      }
    `;

    const planeGeo = new THREE.PlaneGeometry(6, 6);
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
    });

    this.neuralMesh = new THREE.Mesh(planeGeo, this.material);
    this.neuralMesh.position.z = -0.06;
    this.focalGroup.add(this.neuralMesh);

    // Grille 3D : triangles (wireframe) + carrés (lignes) + petits triangles (line loops)
    this.gridGroup = new THREE.Group();
    this.gridGroup.position.z = 0.04;
    this._buildAnimatedGrid(this.gridGroup);
    this.focalGroup.add(this.gridGroup);
  }

  /**
   * Plane subdivisé en fil de fer = uniquement des arêtes de triangles.
   * Grille de lignes horizontales/verticales = carrés (sans diagonales).
   * Quelques LineLoop triangulaires pour accentuer la forme « triangle ».
   */
  _buildAnimatedGrid(group) {
    const triColor = 0x7a9cff;
    const squareColor = 0xc9a962;
    const accentColor = 0xe8b86d;

    // 1) Maillage triangulaire (chaque cellule du plane = 2 triangles visibles en wireframe)
    const wfSegX = 22;
    const wfSegY = 14;
    const wfW = 4.8;
    const wfH = 4.2;
    const wfGeo = new THREE.PlaneGeometry(wfW, wfH, wfSegX, wfSegY);
    const wfMat = new THREE.MeshBasicMaterial({
      color: triColor,
      wireframe: true,
      transparent: true,
      opacity: 0.11,
      depthWrite: false,
    });
    const wfMesh = new THREE.Mesh(wfGeo, wfMat);
    wfMesh.name = "grid-wireframe-triangles";
    group.add(wfMesh);

    // 2) Grille de carrés : uniquement lignes H/V (pas les diagonales des tris)
    const sqDivX = 14;
    const sqDivY = 10;
    const sqW = wfW * 0.98;
    const sqH = wfH * 0.98;
    const squareLines = this._createSquareGridLines(sqW, sqH, sqDivX, sqDivY, squareColor, 0.22);
    squareLines.name = "grid-square-lines";
    group.add(squareLines);

    // 3) Petits contours triangulaires dispersés (rappel visuel « triangle »)
    const nDecor = 18;
    const rng = (i) => {
      const s = Math.sin(i * 12.9898) * 43758.5453;
      return s - Math.floor(s);
    };
    for (let i = 0; i < nDecor; i++) {
      const r = 0.055 + rng(i) * 0.07;
      const tri = this._createTriangleLineLoop(r, accentColor, 0.28 + rng(i + 3) * 0.2);
      const gx = (rng(i + 1) - 0.5) * wfW * 0.85;
      const gy = (rng(i + 2) - 0.5) * wfH * 0.85;
      tri.position.set(gx, gy, 0.002 + i * 0.0001);
      tri.userData.phase = rng(i + 4) * Math.PI * 2;
      tri.userData.speed = 0.4 + rng(i + 5) * 0.9;
      group.add(tri);
    }

    this._decorTriangles = group.children.filter((c) => c.userData.phase != null);
  }

  /**
   * Lignes horizontales et verticales régulières → quadrillage type « carrés ».
   */
  _createSquareGridLines(width, height, divisionsX, divisionsY, color, opacity) {
    const points = [];
    const dx = width / divisionsX;
    const dy = height / divisionsY;
    const hx = width / 2;
    const hy = height / 2;
    for (let i = 0; i <= divisionsX; i++) {
      const x = -hx + i * dx;
      points.push(new THREE.Vector3(x, -hy, 0), new THREE.Vector3(x, hy, 0));
    }
    for (let j = 0; j <= divisionsY; j++) {
      const y = -hy + j * dy;
      points.push(new THREE.Vector3(-hx, y, 0), new THREE.Vector3(hx, y, 0));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    });
    return new THREE.LineSegments(geo, mat);
  }

  /** Triangle équilatéral filaire (LineLoop). */
  _createTriangleLineLoop(radius, color, opacity) {
    const h = radius;
    const pts = [
      new THREE.Vector3(0, h, 0),
      new THREE.Vector3(-h * 0.866025, -h * 0.5, 0),
      new THREE.Vector3(h * 0.866025, -h * 0.5, 0),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    });
    return new THREE.LineLoop(geo, mat);
  }

  _onResize = () => this.resize();

  resize() {
    const w = this.container.clientWidth;
    const h = Math.max(this.container.clientHeight, 1);
    this.uniforms.uResolution.value.set(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  setTransitionProgress(v) {
    this.uniforms.uTransitionProgress.value = THREE.MathUtils.clamp(v, 0, 1);
  }

  setRotationInfluence(v) {
    this.uniforms.uRotationInfluence.value = THREE.MathUtils.clamp(v, 0, 2);
  }

  /**
   * Loupe : rapproche la caméra et tout le focalGroup (shader + grille).
   */
  setLoupeProgress(v) {
    const p = THREE.MathUtils.clamp(v, 0, 1);
    this.uniforms.uLoupeProgress.value = p;
    const z = THREE.MathUtils.lerp(2.4, 0.95, p);
    this.camera.position.z = z;
    this.focalGroup.position.z = THREE.MathUtils.lerp(0, 0.15, p);
  }

  getLoupeProgress() {
    return this.uniforms.uLoupeProgress.value;
  }

  /**
   * Animation continue : la grille ondule / tourne légèrement ; les petits triangles pulsent.
   * L'intensité du drag (uRotationInfluence) amplifie le mouvement.
   */
  _tick = () => {
    if (!this._running) return;
    const dt = this._clock.getDelta();
    this.uniforms.uTime.value += dt * this._timeScale;

    const t = this.uniforms.uTime.value;
    const inf = this.uniforms.uRotationInfluence.value;
    const wobble = 1 + inf * 0.55;

    if (this.gridGroup) {
      this.gridGroup.rotation.z = Math.sin(t * 0.17) * 0.055 * wobble;
      this.gridGroup.rotation.y = Math.sin(t * 0.11) * 0.04 * wobble;
      this.gridGroup.rotation.x = Math.sin(t * 0.09) * 0.028 * wobble;
      this.gridGroup.position.y = Math.sin(t * 0.42) * 0.045 * wobble;
      this.gridGroup.position.x = Math.cos(t * 0.36) * 0.038 * wobble;
      // Léger « respiration » d’échelle
      const s = 1 + Math.sin(t * 0.25) * 0.015 * wobble;
      this.gridGroup.scale.setScalar(s);
    }

    if (this._decorTriangles) {
      for (const line of this._decorTriangles) {
        const ph = line.userData.phase;
        const sp = line.userData.speed;
        line.rotation.z = ph + t * sp * 0.35;
        const pulse = 0.92 + Math.sin(t * sp + ph) * 0.08;
        line.scale.setScalar(pulse);
      }
    }

    this.renderer.render(this.scene, this.camera);
    this._raf = requestAnimationFrame(this._tick);
  };

  dispose() {
    this._running = false;
    cancelAnimationFrame(this._raf);
    window.removeEventListener("resize", this._onResize);

    this.scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const m = obj.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m.dispose();
      }
    });

    this.renderer.dispose();
  }
}
