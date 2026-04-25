/**
 * BLOOD CURSOR — Three.js Blood Trail System
 * @description Curseur custom 3D avec traces de sang, physique de gouttes,
 * splatter au sol, embers ambiantes. Inspire par Bruno Simon.
 *
 * Systeme adaptatif : detecte les FPS et reduit les particules
 * si le device ne suit pas (300 → 100 → 50 drops).
 *
 * Desactive automatiquement sur mobile (touch devices).
 *
 * @requires THREE.js (r128+)
 * @author Scory
 */

(function() {
    // This cursor only activates on JIMMY project (index 5)
    // Exposed globally so app.js can toggle it
    let bloodCursorActive = false;
    let bloodCanvas = null;

    // Check if Three.js is loaded
    if (typeof THREE === 'undefined') {
        console.warn('[BLOOD] Three.js not loaded');
        return;
    }

    // ==================== SETUP ====================
    const canvas = document.createElement('canvas');
    canvas.id = 'blood-three';
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:999990;pointer-events:none;display:none;';
    document.body.appendChild(canvas);

    // DON'T hide cursor by default — only when JIMMY project is active
    // The portfolio has its own cursor system (cursor.js)
    bloodCanvas = canvas;

    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();

    // Orthographic camera (2D overlay)
    const frustumSize = window.innerHeight;
    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.OrthographicCamera(
        -frustumSize * aspect / 2, frustumSize * aspect / 2,
        frustumSize / 2, -frustumSize / 2,
        0.1, 1000
    );
    camera.position.z = 100;

    // ==================== MOUSE TRACKING ====================
    const mouse = { x: 0, y: 0, prevX: 0, prevY: 0, speed: 0 };
    const mouseNDC = { x: 0, y: 0 }; // Normalized device coordinates

    document.addEventListener('mousemove', (e) => {
        mouse.prevX = mouse.x;
        mouse.prevY = mouse.y;
        mouse.x = e.clientX;
        mouse.y = e.clientY;

        // Convert to Three.js coordinates (center origin, y-up)
        mouseNDC.x = e.clientX - window.innerWidth / 2;
        mouseNDC.y = -(e.clientY - window.innerHeight / 2);

        // Calculate speed
        const dx = mouse.x - mouse.prevX;
        const dy = mouse.y - mouse.prevY;
        mouse.speed = Math.sqrt(dx * dx + dy * dy);
    });

    // ==================== CURSOR DOT (main cursor) ====================
    const cursorGeometry = new THREE.CircleGeometry(4, 16);
    const cursorMaterial = new THREE.MeshBasicMaterial({
        color: 0xc41e3a,
        transparent: true,
        opacity: 0.9
    });
    const cursorDot = new THREE.Mesh(cursorGeometry, cursorMaterial);
    cursorDot.position.z = 10;
    scene.add(cursorDot);

    // Cursor ring
    const ringGeometry = new THREE.RingGeometry(14, 16, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x8b1a1a,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    const cursorRing = new THREE.Mesh(ringGeometry, ringMaterial);
    cursorRing.position.z = 9;
    scene.add(cursorRing);

    // Cursor glow
    const glowGeometry = new THREE.CircleGeometry(30, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x8b1a1a,
        transparent: true,
        opacity: 0.06
    });
    const cursorGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    cursorGlow.position.z = 8;
    scene.add(cursorGlow);

    // ==================== FPS-BASED ADAPTATION ====================
    let bcMaxDrops = 300;
    let bcTrailLength = 60;
    let bcEmberCount = 40;
    let bcFrameCount = 0;
    let bcLastFpsCheck = performance.now();

    function bcCheckPerformance() {
        bcFrameCount++;
        const now = performance.now();
        if (now - bcLastFpsCheck >= 2000) {
            const fps = bcFrameCount / ((now - bcLastFpsCheck) / 1000);
            bcFrameCount = 0;
            bcLastFpsCheck = now;
            if (fps < 20) {
                bcMaxDrops = 50;
                bcTrailLength = 10;
                bcEmberCount = 5;
            } else if (fps < 30) {
                bcMaxDrops = 100;
                bcTrailLength = 20;
                bcEmberCount = 15;
            } else {
                bcMaxDrops = 300;
                bcTrailLength = 60;
                bcEmberCount = 40;
            }
        }
    }

    // ==================== BLOOD DROP SYSTEM ====================
    const MAX_DROPS = 300;
    const drops = [];

    class BloodDrop {
        constructor(x, y, size, velocityX, velocityY) {
            const geo = new THREE.CircleGeometry(size, 8);
            const mat = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(0, 0.8, 0.15 + Math.random() * 0.15),
                transparent: true,
                opacity: 0.7 + Math.random() * 0.3
            });
            this.mesh = new THREE.Mesh(geo, mat);
            this.mesh.position.set(x, y, 5 + Math.random() * 3);
            scene.add(this.mesh);

            this.vx = velocityX * (0.3 + Math.random() * 0.7);
            this.vy = velocityY * (0.3 + Math.random() * 0.7);
            this.gravity = -0.15 - Math.random() * 0.1;
            this.life = 1.0;
            this.decay = 0.005 + Math.random() * 0.008;
            this.size = size;
            this.splattered = false;
        }

        update() {
            this.vx *= 0.98;
            this.vy += this.gravity;
            this.vy *= 0.99;

            this.mesh.position.x += this.vx;
            this.mesh.position.y += this.vy;

            this.life -= this.decay;
            this.mesh.material.opacity = Math.max(0, this.life * 0.8);

            // Stretch in direction of movement
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (speed > 0.5) {
                const angle = Math.atan2(this.vy, this.vx);
                this.mesh.rotation.z = angle;
                this.mesh.scale.set(1 + speed * 0.1, Math.max(0.5, 1 - speed * 0.05), 1);
            }

            // Splatter at bottom
            if (this.mesh.position.y < -window.innerHeight / 2 && !this.splattered) {
                this.splattered = true;
                this.vy = 0;
                this.vx = 0;
                this.decay = 0.02;
                this.mesh.scale.set(2, 0.3, 1);
            }

            return this.life > 0;
        }

        destroy() {
            scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }

    function spawnBloodDrop(x, y, dirX, dirY, count) {
        for (let i = 0; i < count; i++) {
            const size = 1 + Math.random() * 3;
            const spread = 0.5 + Math.random() * 2;
            const vx = dirX * spread + (Math.random() - 0.5) * 3;
            const vy = dirY * spread + (Math.random() - 0.5) * 3 + Math.random() * 2;

            if (drops.length >= bcMaxDrops) {
                const oldest = drops.shift();
                oldest.destroy();
            }

            const drop = new BloodDrop(x, y, size, vx, vy);
            drops.push(drop);
        }
    }

    // ==================== BLOOD TRAIL ====================
    const TRAIL_LENGTH = 60;
    const trailPoints = [];

    class TrailPoint {
        constructor(x, y) {
            const geo = new THREE.CircleGeometry(2 + Math.random() * 2, 6);
            const mat = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(0, 0.85, 0.12 + Math.random() * 0.08),
                transparent: true,
                opacity: 0.5
            });
            this.mesh = new THREE.Mesh(geo, mat);
            this.mesh.position.set(x, y, 4);
            scene.add(this.mesh);

            this.life = 1.0;
            this.decay = 0.015 + Math.random() * 0.01;
            this.dripSpeed = 0.1 + Math.random() * 0.3;
        }

        update() {
            this.life -= this.decay;
            this.mesh.material.opacity = Math.max(0, this.life * 0.4);
            // Drip downward
            this.mesh.position.y -= this.dripSpeed;
            this.dripSpeed += 0.01; // Accelerate
            this.mesh.scale.y = 1 + (1 - this.life) * 2; // Stretch as it drips
            return this.life > 0;
        }

        destroy() {
            scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }

    // ==================== EMBER PARTICLES ====================
    const EMBER_COUNT = 40;
    const embers = [];

    class Ember {
        constructor() {
            const size = 0.5 + Math.random() * 1.5;
            const geo = new THREE.CircleGeometry(size, 6);
            const isBlue = Math.random() > 0.7;
            const mat = new THREE.MeshBasicMaterial({
                color: isBlue ? 0x2a6fdb : 0x8b1a1a,
                transparent: true,
                opacity: 0.1 + Math.random() * 0.3
            });
            this.mesh = new THREE.Mesh(geo, mat);
            this.reset();
            scene.add(this.mesh);

            this.baseOpacity = this.mesh.material.opacity;
            this.wobbleSpeed = 0.5 + Math.random() * 2;
            this.wobbleAmp = 10 + Math.random() * 30;
            this.phase = Math.random() * Math.PI * 2;
            this.speed = 0.2 + Math.random() * 0.5;
        }

        reset() {
            this.mesh.position.x = (Math.random() - 0.5) * window.innerWidth;
            this.mesh.position.y = -window.innerHeight / 2 - Math.random() * 100;
            this.mesh.position.z = 1 + Math.random() * 3;
        }

        update(time) {
            this.mesh.position.y += this.speed;
            this.mesh.position.x += Math.sin(time * this.wobbleSpeed + this.phase) * 0.3;
            this.mesh.material.opacity = this.baseOpacity * (0.5 + Math.sin(time * 2 + this.phase) * 0.5);

            if (this.mesh.position.y > window.innerHeight / 2 + 50) {
                this.reset();
            }
        }
    }

    for (let i = 0; i < EMBER_COUNT; i++) {
        embers.push(new Ember());
    }

    // ==================== HOVER DETECTION ====================
    let isHoveringInteractive = false;
    document.addEventListener('mouseover', (e) => {
        const el = e.target.closest('a, button, .btn-choice, .btn-main, .arc-card, .home-arc, .home-link');
        isHoveringInteractive = !!el;
    });

    // ==================== CLICK BLOOD BURST ====================
    document.addEventListener('click', (e) => {
        const x = e.clientX - window.innerWidth / 2;
        const y = -(e.clientY - window.innerHeight / 2);
        spawnBloodDrop(x, y, 0, 0, 15);
    });

    // ==================== ANIMATION LOOP ====================
    const clock = new THREE.Clock();
    let ringTargetScale = 1;

    function animate() {
        requestAnimationFrame(animate);
        bcCheckPerformance();
        const time = clock.getElapsedTime();

        // Update cursor position (smooth follow)
        const targetX = mouseNDC.x;
        const targetY = mouseNDC.y;

        cursorDot.position.x += (targetX - cursorDot.position.x) * 0.3;
        cursorDot.position.y += (targetY - cursorDot.position.y) * 0.3;

        cursorRing.position.x += (targetX - cursorRing.position.x) * 0.12;
        cursorRing.position.y += (targetY - cursorRing.position.y) * 0.12;

        cursorGlow.position.x += (targetX - cursorGlow.position.x) * 0.08;
        cursorGlow.position.y += (targetY - cursorGlow.position.y) * 0.08;

        // Ring pulse
        ringTargetScale = isHoveringInteractive ? 1.8 : 1;
        const currentScale = cursorRing.scale.x;
        const newScale = currentScale + (ringTargetScale - currentScale) * 0.1;
        cursorRing.scale.set(newScale, newScale, 1);
        ringMaterial.opacity = isHoveringInteractive ? 0.5 : 0.3;

        // Cursor glow pulse
        glowMaterial.opacity = 0.04 + Math.sin(time * 3) * 0.02;
        const glowScale = 1 + Math.sin(time * 2) * 0.1;
        cursorGlow.scale.set(glowScale, glowScale, 1);

        // Spawn trail based on speed
        if (mouse.speed > 2) {
            const spawnCount = Math.min(3, Math.floor(mouse.speed / 8));
            for (let i = 0; i < spawnCount; i++) {
                if (trailPoints.length >= bcTrailLength) {
                    const oldest = trailPoints.shift();
                    oldest.destroy();
                }
                const offsetX = (Math.random() - 0.5) * mouse.speed * 0.3;
                const offsetY = (Math.random() - 0.5) * mouse.speed * 0.3;
                trailPoints.push(new TrailPoint(
                    mouseNDC.x + offsetX,
                    mouseNDC.y + offsetY
                ));
            }
        }

        // Spawn blood drops on fast movement
        if (mouse.speed > 15) {
            const dx = mouse.x - mouse.prevX;
            const dy = mouse.y - mouse.prevY;
            const dirX = dx * 0.2;
            const dirY = -dy * 0.2;
            spawnBloodDrop(mouseNDC.x, mouseNDC.y, dirX, dirY, Math.floor(mouse.speed / 20));
        }

        // Update trail points
        for (let i = trailPoints.length - 1; i >= 0; i--) {
            if (!trailPoints[i].update()) {
                trailPoints[i].destroy();
                trailPoints.splice(i, 1);
            }
        }

        // Update blood drops
        for (let i = drops.length - 1; i >= 0; i--) {
            if (!drops[i].update()) {
                drops[i].destroy();
                drops.splice(i, 1);
            }
        }

        // Update embers (only up to adaptive count)
        for (let i = 0; i < Math.min(embers.length, bcEmberCount); i++) {
            embers[i].update(time);
            embers[i].mesh.visible = true;
        }
        for (let i = bcEmberCount; i < embers.length; i++) {
            embers[i].mesh.visible = false;
        }

        // Decay mouse speed
        mouse.speed *= 0.9;

        renderer.render(scene, camera);
    }

    animate();

    // ==================== RESIZE ====================
    window.addEventListener('resize', () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setSize(w, h);
        const aspect = w / h;
        camera.left = -h * aspect / 2;
        camera.right = h * aspect / 2;
        camera.top = h / 2;
        camera.bottom = -h / 2;
        camera.updateProjectionMatrix();
    });

    // ==================== MOBILE: disable cursor effects ====================
    if ('ontouchstart' in window) {
        canvas.style.display = 'none';
        document.body.style.cursor = 'auto';
        if (oldCursor) oldCursor.style.display = 'none';
    }

    console.log('[BLOOD] Three.js blood cursor ready (hidden until JIMMY project)');

    // Global toggle functions
    window.enableBloodCursor = function() {
        if (bloodCursorActive) return;
        bloodCursorActive = true;
        canvas.style.display = 'block';
        // Hide portfolio's default cursor
        document.querySelector('.cursor-dot')?.style.setProperty('display', 'none');
        document.querySelector('.cursor-ring')?.style.setProperty('display', 'none');
    };

    window.disableBloodCursor = function() {
        if (!bloodCursorActive) return;
        bloodCursorActive = false;
        canvas.style.display = 'none';
        // Restore portfolio's default cursor
        document.querySelector('.cursor-dot')?.style.setProperty('display', '');
        document.querySelector('.cursor-ring')?.style.setProperty('display', '');
    };
})();
