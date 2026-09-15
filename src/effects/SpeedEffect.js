/**
 * SpeedEffect - High-Intensity Cyberpunk Radial Speed Warp & Wind Lines Overlay
 * Features:
 *  - 2D Canvas dynamic anime / arcade radial speed lines radiating from horizon vanishing point
 *  - Dual-tone neon laser streaks (cyan / magenta / white) with variable lengths and speed stretch
 *  - Edge chromatic vignette with pulsating redline aura
 *  - High-performance 60fps rendering with zero garbage collection
 */

export class SpeedEffect {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'nr-speed-canvas-overlay';
        this.canvas.style.position = 'fixed';
        this.canvas.style.inset = '0';
        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '90';
        this.canvas.style.opacity = '0';
        this.canvas.style.transition = 'opacity 0.15s ease-out';

        this.ctx = this.canvas.getContext('2d', { alpha: true });

        // Vignette HTML element for peripheral motion blur look
        this.vignette = document.createElement('div');
        this.vignette.className = 'nr-speed-vignette-overlay';

        document.body.appendChild(this.vignette);
        document.body.appendChild(this.canvas);

        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this._resize();

        // 80 Radial speed streaks radiating from vanishing center
        this.numLines = 80;
        this.lines = [];
        this._initLines();

        window.addEventListener('resize', () => this._resize());
    }

    _resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = Math.floor(this.width * Math.min(window.devicePixelRatio, 1.5));
        this.canvas.height = Math.floor(this.height * Math.min(window.devicePixelRatio, 1.5));
    }

    _initLines() {
        this.lines = [];
        const colors = [
            'rgba(0, 240, 255, ',    // Cyan
            'rgba(180, 50, 255, ',   // Electric Violet
            'rgba(255, 46, 147, ',   // Hot Pink
            'rgba(255, 255, 255, '   // Pure Laser White
        ];

        for (let i = 0; i < this.numLines; i++) {
            this.lines.push({
                angle: Math.random() * Math.PI * 2,
                dist: 0.15 + Math.random() * 0.85, // 0 to 1 normalized distance from center
                length: 0.08 + Math.random() * 0.25,
                speed: 0.8 + Math.random() * 1.2,
                colorPrefix: colors[Math.floor(Math.random() * colors.length)],
                width: 1.2 + Math.random() * 2.2,
                alpha: 0.3 + Math.random() * 0.7
            });
        }
    }

    /**
     * Updates and renders radial speed lines.
     * @param {number} speedRatio - Normalized speed (0 to 1)
     * @param {number} delta - Frame delta in seconds
     * @param {boolean} isAccelerating - Whether throttle is active
     */
    update(speedRatio, delta, isAccelerating = false) {
        if (!this.ctx) return;

        // Effect threshold: starts activating at 15% speed, ramps up aggressively
        const effectiveSpeed = Math.max(0, (speedRatio - 0.12) / 0.88);
        const targetOpacity = effectiveSpeed > 0.02
            ? Math.min(1.0, Math.pow(effectiveSpeed, 1.1) * 1.3)
            : 0;

        this.canvas.style.opacity = targetOpacity.toFixed(3);
        this.vignette.style.opacity = (effectiveSpeed * 0.85).toFixed(3);

        const redlineIntensity = Math.max(0, (speedRatio - 0.80) / 0.20);
        this.vignette.style.setProperty('--nr-redline-opacity', (redlineIntensity * 0.95).toFixed(3));

        if (targetOpacity <= 0.01) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        }

        const cw = this.canvas.width;
        const ch = this.canvas.height;
        const cx = cw * 0.5;
        const cy = ch * 0.48; // Vanishing point slightly below center (road horizon)
        const maxRadius = Math.sqrt(cx * cx + cy * cy) * 1.1;

        this.ctx.clearRect(0, 0, cw, ch);
        this.ctx.lineCap = 'round';

        const speedMultiplier = (1.5 + effectiveSpeed * 4.5) * (isAccelerating ? 1.4 : 1.0);
        const dt = Math.min(delta, 0.05);

        for (let i = 0; i < this.lines.length; i++) {
            const line = this.lines[i];

            // Advance streak outward toward screen edges
            line.dist += line.speed * speedMultiplier * dt;

            // Reset when streak passes off screen
            if (line.dist > 1.25) {
                line.dist = 0.12 + Math.random() * 0.25;
                line.angle = Math.random() * Math.PI * 2;
                line.length = 0.08 + Math.random() * (0.2 + effectiveSpeed * 0.35);
                line.width = 1.0 + Math.random() * (1.5 + effectiveSpeed * 2.5);
            }

            const rInner = Math.max(0, line.dist - line.length * (1.0 + effectiveSpeed * 1.8)) * maxRadius;
            const rOuter = line.dist * maxRadius;

            // Avoid drawing right over the center car focal zone
            if (rOuter < maxRadius * 0.22) continue;

            const x1 = cx + Math.cos(line.angle) * rInner;
            const y1 = cy + Math.sin(line.angle) * rInner;
            const x2 = cx + Math.cos(line.angle) * rOuter;
            const y2 = cy + Math.sin(line.angle) * rOuter;

            const streakAlpha = Math.min(1.0, line.alpha * targetOpacity * (0.4 + effectiveSpeed * 0.8));

            this.ctx.strokeStyle = line.colorPrefix + streakAlpha.toFixed(2) + ')';
            this.ctx.lineWidth = line.width * (1.0 + effectiveSpeed * 0.8);

            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }
    }

    destroy() {
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        if (this.vignette && this.vignette.parentNode) {
            this.vignette.parentNode.removeChild(this.vignette);
        }
    }
}
