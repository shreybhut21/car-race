/**
 * HUD Component - Synthwave / Cyberpunk Heads-Up Display
 * Features:
 *  - Top-Left: Checkered flag icon + precision race timer (TIME MM:SS:mmm)
 *  - Bottom-Right: Circular Radial Cyber Dial Speedometer with sweeping neon needle,
 *                  glowing arc gauge, gear indicator, drift/boost telemetry & digital readout
 *  - Top-Right: Sound toggle & Exit / Reset button
 */

export class HUD {
    constructor(options = {}) {
        this.options = Object.assign({
            onExit: null,
            onMuteToggle: null,
            maxDisplaySpeed: 255, // Top speed in MPH for arcade feel
        }, options);

        this.elapsedTime = 0;
        this.isRunning = false;
        this.isMuted = false;
        this.displayedSpeed = 0;
        this.currentGear = 'N';

        // Radial gauge constants
        this.ARC_TOTAL_LENGTH = 385.37; // 240 deg arc of R=92 (2 * PI * 92 * 240/360)
        this.MIN_NEEDLE_DEG = -120;     // 0 MPH angle
        this.MAX_NEEDLE_DEG = 120;      // 255 MPH angle

        this._createDOM();
        this._bindEvents();
    }

    _createDOM() {
        this.container = document.createElement('div');
        this.container.className = 'nr-hud-container';

        // ── Top-Left: Race Timer ──
        const timerHTML = `
            <div class="nr-timer-hud" id="nrTimerHud">
                <div class="nr-flag-icon">
                    <svg viewBox="0 0 28 22" width="28" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 2H8V6H2V2Z" fill="#ffffff"/>
                        <path d="M8 2H14V6H8V2Z" fill="#111122"/>
                        <path d="M14 2H20V6H14V2Z" fill="#ffffff"/>
                        <path d="M20 2H26V6H20V2Z" fill="#111122"/>
                        
                        <path d="M2 6H8V10H2V6Z" fill="#111122"/>
                        <path d="M8 6H14V10H8V6Z" fill="#ffffff"/>
                        <path d="M14 6H20V10H14V6Z" fill="#111122"/>
                        <path d="M20 6H26V10H20V6Z" fill="#ffffff"/>

                        <path d="M2 10H8V14H2V10Z" fill="#ffffff"/>
                        <path d="M8 10H14V14H8V10Z" fill="#111122"/>
                        <path d="M14 10H20V14H14V10Z" fill="#ffffff"/>
                        <path d="M20 10H26V14H20V10Z" fill="#111122"/>

                        <path d="M2 14H8V18H2V14Z" fill="#111122"/>
                        <path d="M8 14H14V18H8V14Z" fill="#ffffff"/>
                        <path d="M14 14H20V18H14V14Z" fill="#111122"/>
                        <path d="M20 14H26V18H20V14Z" fill="#ffffff"/>
                        
                        <!-- Flag Pole / Border Glow -->
                        <rect x="1" y="1" width="26" height="18" rx="1" stroke="#ff3fd8" stroke-width="1.2" fill="none" opacity="0.6"/>
                    </svg>
                </div>
                <div class="nr-timer-content">
                    <span class="nr-timer-label">TIME</span>
                    <span class="nr-timer-digits" id="nrTimerDigits">00:00:000</span>
                </div>
            </div>
        `;

        // ── Top-Right: Sound & Exit Controls ──
        const controlsHTML = `
            <div class="nr-top-controls" id="nrTopControls">
                <button class="nr-ctrl-btn nr-btn-audio" id="nrBtnAudio" title="Toggle Sound">
                    <svg class="nr-icon-speaker" id="nrSpeakerIcon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                </button>
                <button class="nr-ctrl-btn nr-btn-exit" id="nrBtnExit" title="Reset / Exit Game">
                    <span class="nr-exit-icon">✕</span>
                    <span class="nr-exit-text">EXIT</span>
                </button>
            </div>
        `;

        // ── Bottom-Right: Circular Radial Cyber Dial Speedometer ──
        const speedometerHTML = `
            <div class="nr-speedo-radial-hud" id="nrSpeedoHud">
                <div class="nr-radial-dial-frame">
                    <!-- Glass Backplate & Glow -->
                    <div class="nr-radial-backdrop"></div>

                    <!-- SVG Circular Gauge Dial -->
                    <svg class="nr-radial-svg" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <!-- Main Cyber Arc Gradient: Cyan -> Purple -> Hot Pink -> Redline Scarlet -->
                            <linearGradient id="radialArcGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                                <stop offset="0%" stop-color="#00f0ff" />
                                <stop offset="35%" stop-color="#b32aff" />
                                <stop offset="70%" stop-color="#ff2e93" />
                                <stop offset="100%" stop-color="#ff203a" />
                            </linearGradient>

                            <!-- Needle Laser Gradient -->
                            <linearGradient id="needleLaserGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                                <stop offset="0%" stop-color="#a82aff" stop-opacity="0.8" />
                                <stop offset="40%" stop-color="#ff2e93" />
                                <stop offset="100%" stop-color="#00f0ff" />
                            </linearGradient>

                            <!-- Needle Glow Filter -->
                            <filter id="neonNeedleGlow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="3.5" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>

                            <!-- Arc Glow Filter -->
                            <filter id="radialArcGlow" x="-30%" y="-30%" width="160%" height="160%">
                                <feGaussianBlur stdDeviation="4" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>

                            <!-- Center Hub Gradient -->
                            <radialGradient id="hubCoreGrad" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stop-color="#ff2e93" />
                                <stop offset="60%" stop-color="#241038" />
                                <stop offset="100%" stop-color="#0e0618" />
                            </radialGradient>
                        </defs>

                        <!-- Outer Dial Cyber Ring -->
                        <circle cx="120" cy="120" r="106" stroke="rgba(255, 60, 216, 0.22)" stroke-width="1.5" stroke-dasharray="3 4" fill="none" />
                        <circle cx="120" cy="120" r="99" stroke="rgba(0, 240, 255, 0.15)" stroke-width="1" fill="none" />

                        <!-- Background Inactive Track (240 deg arc from 150 to 390 deg) -->
                        <circle class="nr-radial-bg-track"
                            cx="120" cy="120" r="92"
                            stroke="rgba(255, 255, 255, 0.08)"
                            stroke-width="7"
                            stroke-linecap="round"
                            stroke-dasharray="385.37 578.05"
                            stroke-dashoffset="0"
                            transform="rotate(150 120 120)"
                            fill="none" />

                        <!-- Secondary Segment Ticks Background Arc -->
                        <circle
                            cx="120" cy="120" r="84"
                            stroke="rgba(255, 255, 255, 0.05)"
                            stroke-width="3"
                            stroke-dasharray="2 6"
                            stroke-dashoffset="0"
                            transform="rotate(150 120 120)"
                            fill="none" />

                        <!-- Active Glowing Progress Speed Arc -->
                        <circle class="nr-radial-active-arc" id="nrRadialActiveArc"
                            cx="120" cy="120" r="92"
                            stroke="url(#radialArcGrad)"
                            stroke-width="7"
                            stroke-linecap="round"
                            stroke-dasharray="385.37 578.05"
                            stroke-dashoffset="385.37"
                            transform="rotate(150 120 120)"
                            filter="url(#radialArcGlow)"
                            fill="none" />

                        <!-- Major Milestone Ticks & Labels -->
                        <!-- 0 MPH (-120 deg) -->
                        <line x1="54.2" y1="158.0" x2="43.8" y2="164.0" stroke="#00f0ff" stroke-width="2.5" stroke-linecap="round" />
                        <text x="66" y="154" class="nr-gauge-tick-label">0</text>

                        <!-- Minor tick 20 -->
                        <line x1="47.3" y1="133.0" x2="40.2" y2="134.8" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" />

                        <!-- 40 MPH (-80 deg) -->
                        <line x1="45.2" y1="106.8" x2="33.3" y2="104.7" stroke="#00f0ff" stroke-width="2.5" stroke-linecap="round" />
                        <text x="59" y="112" class="nr-gauge-tick-label">40</text>

                        <!-- Minor tick 60 -->
                        <line x1="54.5" y1="82.4" x2="48.0" y2="76.6" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" />

                        <!-- 80 MPH (-40 deg) -->
                        <line x1="71.1" y1="61.8" x2="63.4" y2="52.6" stroke="#b32aff" stroke-width="2.5" stroke-linecap="round" />
                        <text x="81" y="75" class="nr-gauge-tick-label">80</text>

                        <!-- Minor tick 100 -->
                        <line x1="93.8" y1="47.8" x2="90.5" y2="39.0" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" />

                        <!-- 120 MPH (0 deg - Top Center) -->
                        <line x1="120" y1="44" x2="120" y2="32" stroke="#ff2e93" stroke-width="3" stroke-linecap="round" />
                        <text x="120" y="60" class="nr-gauge-tick-label nr-tick-top">120</text>

                        <!-- Minor tick 140 -->
                        <line x1="146.2" y1="47.8" x2="149.5" y2="39.0" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" />

                        <!-- 160 MPH (40 deg) -->
                        <line x1="168.9" y1="61.8" x2="176.6" y2="52.6" stroke="#ff2e93" stroke-width="2.5" stroke-linecap="round" />
                        <text x="159" y="75" class="nr-gauge-tick-label">160</text>

                        <!-- Minor tick 180 -->
                        <line x1="185.5" y1="82.4" x2="192.0" y2="76.6" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" />

                        <!-- 200 MPH (80 deg - Redline threshold) -->
                        <line x1="194.8" y1="106.8" x2="206.7" y2="104.7" stroke="#ff3b30" stroke-width="3" stroke-linecap="round" />
                        <text x="180" y="112" class="nr-gauge-tick-label nr-tick-redline">200</text>

                        <!-- Minor tick 220 -->
                        <line x1="192.7" y1="133.0" x2="199.8" y2="134.8" stroke="#ff3b30" stroke-width="1.8" />

                        <!-- 240+ MPH (120 deg - Max Redline) -->
                        <line x1="185.8" y1="158.0" x2="196.2" y2="164.0" stroke="#ff1020" stroke-width="3" stroke-linecap="round" />
                        <text x="172" y="154" class="nr-gauge-tick-label nr-tick-redline">240</text>

                        <!-- Redline Zone Arc Accent (from 80 deg to 120 deg) -->
                        <circle
                            cx="120" cy="120" r="99"
                            stroke="#ff1020"
                            stroke-width="2.5"
                            stroke-dasharray="64.2 578.05"
                            stroke-dashoffset="0"
                            transform="rotate(350 120 120)"
                            opacity="0.75"
                            fill="none" />

                        <!-- Sweeping Neon Laser Needle -->
                        <g class="nr-radial-needle-group" id="nrNeedleGroup" style="transform: rotate(-120deg); transform-origin: 120px 120px;">
                            <!-- Glowing Laser Needle Blade -->
                            <polygon points="118.2,120 119.2,26 120,16 120.8,26 121.8,120 120,132"
                                fill="url(#needleLaserGrad)"
                                filter="url(#neonNeedleGlow)" />
                            
                            <!-- Sharp White Core Spine -->
                            <line x1="120" y1="120" x2="120" y2="20" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" />
                        </g>

                        <!-- Glowing Center Dial Hub -->
                        <circle cx="120" cy="120" r="26" fill="url(#hubCoreGrad)" stroke="rgba(255, 60, 216, 0.4)" stroke-width="1.5" />
                        <circle cx="120" cy="120" r="14" fill="#120822" stroke="#00f0ff" stroke-width="2" />
                        <circle cx="120" cy="120" r="5" fill="#ff2e93" filter="url(#neonNeedleGlow)" />
                    </svg>

                    <!-- Center Digital Speed & Telemetry Overlay -->
                    <div class="nr-radial-inner-hud">
                        <!-- Upper: Dynamic Gear Box -->
                        <div class="nr-gear-chip" id="nrGearChip">
                            <span class="nr-gear-sub">GEAR</span>
                            <span class="nr-gear-num" id="nrGearValue">1</span>
                        </div>

                        <!-- Center-Lower: Big Digital Speed Readout -->
                        <div class="nr-radial-speed-wrap">
                            <span class="nr-radial-speed-num" id="nrSpeedNumber">0</span>
                            <span class="nr-radial-speed-unit">MPH</span>
                        </div>

                        <!-- Lower Badges: DRIFT / BOOST / MAX -->
                        <div class="nr-radial-status-bar">
                            <span class="nr-status-badge nr-badge-drift" id="nrDriftBadge">DRIFT</span>
                            <span class="nr-status-badge nr-badge-redline" id="nrRedlineBadge">REDLINE</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.container.innerHTML = `
            ${timerHTML}
            ${controlsHTML}
            ${speedometerHTML}
        `;

        document.body.appendChild(this.container);
        this.container.classList.add('hidden');

        // Cache DOM elements
        this.timerDigitsEl  = this.container.querySelector('#nrTimerDigits');
        this.speedNumberEl  = this.container.querySelector('#nrSpeedNumber');
        this.speedoHudEl    = this.container.querySelector('#nrSpeedoHud');
        this.activeArcEl    = this.container.querySelector('#nrRadialActiveArc');
        this.needleGroupEl  = this.container.querySelector('#nrNeedleGroup');
        this.gearValueEl    = this.container.querySelector('#nrGearValue');
        this.gearChipEl     = this.container.querySelector('#nrGearChip');
        this.driftBadgeEl   = this.container.querySelector('#nrDriftBadge');
        this.redlineBadgeEl = this.container.querySelector('#nrRedlineBadge');
        this.btnAudio       = this.container.querySelector('#nrBtnAudio');
        this.btnExit        = this.container.querySelector('#nrBtnExit');
        this.speakerIcon    = this.container.querySelector('#nrSpeakerIcon');
    }

    _bindEvents() {
        if (this.btnAudio) {
            this.btnAudio.addEventListener('click', (e) => {
                e.stopPropagation();
                this.isMuted = !this.isMuted;
                this.btnAudio.classList.toggle('muted', this.isMuted);
                if (this.options.onMuteToggle) {
                    this.options.onMuteToggle(this.isMuted);
                }
            });
        }

        if (this.btnExit) {
            this.btnExit.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.options.onExit) {
                    this.options.onExit();
                } else {
                    this.resetTimer();
                }
            });
        }
    }

    /**
     * Updates HUD each frame.
     * @param {Object} car - Car instance with speed / speedNormalized / isDrifting
     * @param {number} delta - Frame delta in seconds
     */
    update(car, delta) {
        // 1. Advance & update Timer
        if (this.isRunning && delta) {
            this.elapsedTime += delta;
            this._updateTimerDisplay();
        }

        // 2. Compute Arcade Speed & Radial Gauge
        if (car) {
            const rawSpeed = car.speed || 0;
            const normalized = car.speedNormalized || 0;
            const targetMph = Math.round(normalized * this.options.maxDisplaySpeed);

            // Smooth numeric interpolation for crisp feel
            this.displayedSpeed += (targetMph - this.displayedSpeed) * Math.min(1, delta * 18);
            const roundedSpeed = Math.max(0, Math.round(this.displayedSpeed));
            this.speedNumberEl.textContent = roundedSpeed;

            // 3. Sweeping Needle Rotation (-120deg to +120deg)
            const needleAngle = this.MIN_NEEDLE_DEG + (normalized * (this.MAX_NEEDLE_DEG - this.MIN_NEEDLE_DEG));
            if (this.needleGroupEl) {
                this.needleGroupEl.style.transform = `rotate(${needleAngle.toFixed(2)}deg)`;
            }

            // 4. Circular Progress Arc Offset
            if (this.activeArcEl) {
                const targetOffset = this.ARC_TOTAL_LENGTH * (1 - Math.min(1, Math.max(0, normalized)));
                this.activeArcEl.style.strokeDashoffset = targetOffset.toFixed(2);
            }

            // 5. Dynamic Gear Calculation (R, N, 1-6)
            let gear = '1';
            if (rawSpeed < -0.4) {
                gear = 'R';
            } else if (Math.abs(rawSpeed) < 0.2) {
                gear = 'N';
            } else {
                // Progression across 6 gears based on speed normalized
                const gIndex = Math.min(6, Math.max(1, Math.floor(normalized * 5.8) + 1));
                gear = String(gIndex);
            }

            if (gear !== this.currentGear) {
                this.currentGear = gear;
                this.gearValueEl.textContent = gear;
                this.gearChipEl.classList.add('shift-pulse');
                setTimeout(() => {
                    if (this.gearChipEl) this.gearChipEl.classList.remove('shift-pulse');
                }, 200);
            }

            // 6. Drift Telemetry Indicator
            const isDrifting = car.isDrifting || (car.physics && car.physics.isDrifting);
            if (this.driftBadgeEl) {
                if (isDrifting && roundedSpeed > 10) {
                    this.driftBadgeEl.classList.add('active');
                } else {
                    this.driftBadgeEl.classList.remove('active');
                }
            }

            // 7. Redline Warning & Pulse
            const isRedline = normalized > 0.82;
            if (isRedline) {
                this.speedoHudEl.classList.add('redlining');
                if (this.redlineBadgeEl) this.redlineBadgeEl.classList.add('active');
            } else {
                this.speedoHudEl.classList.remove('redlining');
                if (this.redlineBadgeEl) this.redlineBadgeEl.classList.remove('active');
            }
        }
    }

    _updateTimerDisplay() {
        const totalMs = Math.floor(this.elapsedTime * 1000);
        const mins = Math.floor(totalMs / 60000);
        const secs = Math.floor((totalMs % 60000) / 1000);
        const ms = totalMs % 1000;

        const strM = String(mins).padStart(2, '0');
        const strS = String(secs).padStart(2, '0');
        const strMs = String(ms).padStart(3, '0');

        this.timerDigitsEl.textContent = `${strM}:${strS}:${strMs}`;
    }

    startTimer() {
        this.isRunning = true;
    }

    pauseTimer() {
        this.isRunning = false;
    }

    resetTimer() {
        this.elapsedTime = 0;
        this._updateTimerDisplay();
    }

    getTimeString() {
        return this.timerDigitsEl.textContent;
    }

    getTimeMs() {
        return Math.floor(this.elapsedTime * 1000);
    }

    show() {
        this.container.classList.remove('hidden');
    }

    hide() {
        this.container.classList.add('hidden');
    }

    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

