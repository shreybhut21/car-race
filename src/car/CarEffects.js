import * as THREE from 'three';

export class CarEffects {
    constructor(car) {
        this.car = car;
        this.debugEnabled = false;
        this.debugOverlay = null;

        this._setupDebugOverlay();
        this._setupDebugKeyListener();
    }

    _setupDebugOverlay() {
        this.debugOverlay = document.createElement('div');
        this.debugOverlay.className = 'nr-physics-debug';
        this.debugOverlay.style.display = 'none';
        document.body.appendChild(this.debugOverlay);
    }

    _setupDebugKeyListener() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'F3' || (e.code === 'KeyP' && e.shiftKey)) {
                this.toggleDebug();
            }
        });
    }

    toggleDebug() {
        this.debugEnabled = !this.debugEnabled;
        if (this.debugOverlay) {
            this.debugOverlay.style.display = this.debugEnabled ? 'block' : 'none';
        }
    }

    update(delta, physics, input) {
        const dt = Math.min(delta, 0.05);

        // ── 1. Dynamic Body Roll & Pitch Visual Effects ────────────────────────
        if (this.car.visual) {
            const speedRatio = physics.speedNormalized;
            const steer = physics.smoothedSteer;

            // Roll lean: car body rolls away from turn based on steering & speed
            const targetRoll = -steer * (0.04 + 0.06 * speedRatio) * (physics.isDrifting ? 1.4 : 1.0);
            this.car.visual.rotation.z = THREE.MathUtils.lerp(
                this.car.visual.rotation.z,
                targetRoll,
                1 - Math.exp(-10 * dt)
            );

            // Pitch squat/dive: nose dips on heavy braking, squats slightly on hard acceleration
            let targetPitch = 0;
            if (input.throttle > 0 && physics.forwardSpeed > 0) {
                targetPitch = -0.018 * (1 - speedRatio * 0.5); // rear squat
            } else if (input.throttle < 0 && physics.forwardSpeed > 2.0) {
                targetPitch = 0.035 * Math.min(1, physics.forwardSpeed / 25); // nose dive
            }
            this.car.visual.rotation.x = THREE.MathUtils.lerp(
                this.car.visual.rotation.x,
                targetPitch,
                1 - Math.exp(-10 * dt)
            );

            // Yaw body slip: rear steps out smoothly during drift
            const targetYaw = -physics.driftDirection * physics.driftIntensity * 0.22;
            this.car.visual.rotation.y = THREE.MathUtils.lerp(
                this.car.visual.rotation.y,
                targetYaw,
                1 - Math.exp(-8 * dt)
            );
        }

        // ── 2. Dynamic Brake Light / Tail Glow Boost ───────────────────────────
        if (this.car.tailLight) {
            const isBraking = (input.throttle < 0 && physics.forwardSpeed > 0.5) || input.handbrake;
            const targetIntensity = isBraking ? 4.5 : 1.4;
            this.car.tailLight.intensity = THREE.MathUtils.lerp(
                this.car.tailLight.intensity,
                targetIntensity,
                1 - Math.exp(-16 * dt)
            );
        }

        // ── 3. Optional Debug Overlay ──────────────────────────────────────────
        if (this.debugEnabled && this.debugOverlay) {
            this.debugOverlay.innerHTML = `
                <div class="nr-debug-title">🏎️ VEHICLE TELEMETRY (F3)</div>
                <div>Speed: <b>${physics.speedKmh.toFixed(1)} km/h</b> (${(physics.forwardSpeed).toFixed(1)} m/s)</div>
                <div>Normalized: <b>${(physics.speedNormalized * 100).toFixed(0)}%</b></div>
                <div>Throttle / Brake: <b>${input.throttle}</b> | Handbrake: <b>${input.handbrake ? 'ON' : 'OFF'}</b></div>
                <div>Steering Authority: <b>${physics.steerAngleDeg.toFixed(1)}°</b> (Input: ${physics.smoothedSteer.toFixed(2)})</div>
                <div>Drift State: <b>${physics.isDrifting ? 'DRIFTING' : 'GRIP'}</b> (Intensity: ${(physics.driftIntensity * 100).toFixed(0)}%)</div>
                <div>Barrier Impact: <b>${(physics.lastImpactSeverity * 100).toFixed(0)}%</b></div>
            `;
        }
    }
}
