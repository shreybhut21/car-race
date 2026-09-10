import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════════════════
//  NEON RACER - VEHICLE PHYSICS TUNING CONFIGURATION (HORIZON DRIVE ARCADE FEEL)
// ═══════════════════════════════════════════════════════════════════════════════

export const VEHICLE_CONFIG = {
    // ── Speed & Velocity ───────────────────────────────────────────────────────
    MAX_SPEED: 50.0,    // m/s (= 180 km/h) forward top speed
    MAX_REVERSE_SPEED: 11.1,    // m/s (= 40 km/h) reverse top speed

    // ── Acceleration Curve ─────────────────────────────────────────────────────
    // Target times: 0→60 km/h: ~3s, 0→100 km/h: ~6s, 0→180 km/h: ~11s
    ACCEL_BASE: 7.4,     // m/s² initial acceleration from 0 km/h
    ACCEL_EXPONENT: 1.32,    // power decay rate toward top speed
    REVERSE_ACCEL: 3.8,     // m/s² reverse acceleration (weaker)

    // ── Braking & Coasting ─────────────────────────────────────────────────────
    // Target: 180→100 km/h in ~3s, 180→0 in ~5.5s
    BRAKE_DECEL: 9.5,     // m/s² forward brake deceleration (S key)
    HANDBRAKE_DECEL: 15.0,    // m/s² strong handbrake deceleration (Space key)
    COAST_DRAG: 0.990,   // multiplicative drag per frame (60fps baseline)
    ROLLING_RESISTANCE: 0.25,    // m/s² linear resistance acting against motion

    // ── Steering & Speed Authority ─────────────────────────────────────────────
    // Steering authority (max degrees turning response) based on speed:
    // Low, gentle turning rate for smooth track navigation
    STEER_SMOOTH_RATE: 5.8,     // 1/s exponential smoothing rate (gradual response)
    BASE_STEER_RATE: 0.75,    // rad/s base turning rate multiplier (gentle turning)
    STEER_AUTHORITY_CURVE: [
        { speedKmh: 0, angleDeg: 20.0 },
        { speedKmh: 50, angleDeg: 15.0 },
        { speedKmh: 100, angleDeg: 11.0 },
        { speedKmh: 150, angleDeg: 8.0 },
        { speedKmh: 180, angleDeg: 6.5 },
    ],

    // ── Grip & Lateral Physics ────────────────────────────────────────────────
    NORMAL_LATERAL_GRIP: 0.975,   // base lateral velocity damping (planted cornering)
    HIGH_SPEED_GRIP_LOSS: 0.02,    // slight grip relaxation at 180 km/h

    // ── Drift Physics (Space = Handbrake & High-Speed A/D Cornering Drift) ──
    DRIFT_MIN_SPEED: 12.0,    // m/s (~43 km/h) threshold for smooth high-speed drift entry
    DRIFT_FULL_SPEED: 28.0,    // m/s (~100 km/h) full drift responsiveness
    DRIFT_LATERAL_GRIP: 0.72,    // loose lateral grip during drift for wide smooth slides
    DRIFT_YAW_BOOST: 2.1,     // yaw kickout angle while drifting
    DRIFT_SPEED_LOSS_RATE: 0.035,   // gentle speed bleed (~3.5%) during high speed drift
    DRIFT_RECOVERY_TIME: 0.45,    // seconds to smoothly restore full grip on release
    COUNTER_STEER_BONUS: 1.75,    // responsive counter-steering authority

    // ── Barrier Collision & Scraping ──────────────────────────────────────────
    BARRIER_SCRAPE_LOSS_MIN: 1.4,   // m/s (~5 km/h) loss on light glancing scrape
    BARRIER_IMPACT_LOSS_MAX: 7.2,   // m/s (~26 km/h) loss on direct hard impact
    BARRIER_RESTITUTION: 0.18,  // low bounce so car slides smoothly rather than ricocheting
    BARRIER_SLIDE_FRICTION: 2.8,   // m/s² progressive friction when scraping barrier
    BARRIER_YAW_DAMPING: 0.75,  // prevent random yaw spin on collision

    // ── Off-Track Penalty ─────────────────────────────────────────────────────
    OFF_TRACK_GRIP_MULT: 0.72,    // reduced grip when leaving asphalt
    OFF_TRACK_DECEL: 4.5,     // m/s² extra deceleration outside corridor
};

export class CarPhysics {
    constructor() {
        // Linear velocity state
        this.forwardSpeed = 0;        // scalar m/s along car forward axis (+ = fwd, - = rev)
        this.velocity = new THREE.Vector3(); // world-space velocity vector

        // Steering state
        this.rawSteering = 0;         // -1 (left) to +1 (right)
        this.smoothedSteer = 0;       // exponentially smoothed steering (-1 to +1)
        this.steerAngleDeg = 0;       // active effective steering authority in degrees

        // Drift state
        this.isDrifting = false;
        this.driftIntensity = 0;      // 0 = full normal grip, 1 = full drift
        this.driftDirection = 0;      // -1 (sliding right/turning left), +1 (sliding left/turning right)
        this.gripRecoveryTimer = 0;   // timer tracking grip return
        this.driftSlipVel = 0;        // dynamic lateral slide velocity

        // Barrier scrape / collision telemetry
        this.lastImpactSeverity = 0;  // 0 to 1
        this.isScrapingBarrier = false;

        // Reusable vectors for zero per-frame allocation
        this._fwd = new THREE.Vector3();
        this._side = new THREE.Vector3();
    }

    /**
     * Interpolates steering authority (in degrees) based on speed.
     */
    getSteeringAuthority(speedKmh) {
        const curve = VEHICLE_CONFIG.STEER_AUTHORITY_CURVE;
        if (speedKmh <= curve[0].speedKmh) return curve[0].angleDeg;
        if (speedKmh >= curve[curve.length - 1].speedKmh) return curve[curve.length - 1].angleDeg;

        for (let i = 0; i < curve.length - 1; i++) {
            const p0 = curve[i];
            const p1 = curve[i + 1];
            if (speedKmh >= p0.speedKmh && speedKmh <= p1.speedKmh) {
                const frac = (speedKmh - p0.speedKmh) / (p1.speedKmh - p0.speedKmh);
                return p0.angleDeg + frac * (p1.angleDeg - p0.angleDeg);
            }
        }
        return curve[0].angleDeg;
    }

    /**
     * Main physics integration step.
     */
    update(delta, input, carObject) {
        const dt = Math.min(delta, 0.05);

        this._updateThrottleAndBrake(dt, input);
        this._updateSteeringAndDrift(dt, input, carObject);
        this._integrateMotion(dt, carObject);
    }

    // ── 1. Throttle, Brake & Reverse ──────────────────────────────────────────

    _updateThrottleAndBrake(dt, input) {
        const throttleInput = input.throttle; // +1 (W/Up), -1 (S/Down), 0 (none)
        const handbrake = input.handbrake;     // Space bar

        if (throttleInput > 0) {
            // W / Up: Forward acceleration
            if (this.forwardSpeed < 0) {
                // Braking while reversing
                this.forwardSpeed += VEHICLE_CONFIG.BRAKE_DECEL * 1.5 * dt;
                if (this.forwardSpeed > 0) this.forwardSpeed = 0;
            } else {
                // Accelerating forward: non-linear decay curve towards MAX_SPEED
                const speedRatio = Math.max(0, this.forwardSpeed / VEHICLE_CONFIG.MAX_SPEED);
                const accelFactor = Math.max(0.10, Math.pow(Math.max(0, 1 - speedRatio), VEHICLE_CONFIG.ACCEL_EXPONENT));
                const accel = VEHICLE_CONFIG.ACCEL_BASE * accelFactor;
                this.forwardSpeed = Math.min(this.forwardSpeed + accel * dt, VEHICLE_CONFIG.MAX_SPEED);
            }
        } else if (throttleInput < 0) {
            // S / Down: Brake when moving forward, Reverse when near standstill
            if (this.forwardSpeed > 0.4) {
                // Moving forward: progressive foot braking
                this.forwardSpeed = Math.max(this.forwardSpeed - VEHICLE_CONFIG.BRAKE_DECEL * dt, 0);
            } else {
                // Standstill or already reversing: reverse acceleration
                this.forwardSpeed = Math.max(
                    this.forwardSpeed - VEHICLE_CONFIG.REVERSE_ACCEL * dt,
                    -VEHICLE_CONFIG.MAX_REVERSE_SPEED
                );
            }
        } else {
            // Coasting: frame-rate independent drag & rolling resistance
            if (Math.abs(this.forwardSpeed) > 0.05) {
                this.forwardSpeed *= Math.pow(VEHICLE_CONFIG.COAST_DRAG, dt * 60);
                const sign = Math.sign(this.forwardSpeed);
                this.forwardSpeed -= sign * VEHICLE_CONFIG.ROLLING_RESISTANCE * dt;
                if (Math.sign(this.forwardSpeed) !== sign) {
                    this.forwardSpeed = 0;
                }
            } else {
                this.forwardSpeed = 0;
            }
        }

        // Handbrake (Space bar): strong deceleration at any speed
        if (handbrake && Math.abs(this.forwardSpeed) > 0.05) {
            const sign = Math.sign(this.forwardSpeed);
            this.forwardSpeed = Math.max(0, Math.abs(this.forwardSpeed) - VEHICLE_CONFIG.HANDBRAKE_DECEL * dt) * sign;
        }
    }

    // ── 2. Steering, Yaw & Drift Calculation ──────────────────────────────────

    _updateSteeringAndDrift(dt, input, carObject) {
        this.rawSteering = input.steering; // -1 (left), +1 (right)
        const handbrake = input.handbrake;
        const absSpeed = Math.abs(this.forwardSpeed);
        const speedKmh = absSpeed * 3.6;

        // Steering authority based on speed
        this.steerAngleDeg = this.getSteeringAuthority(speedKmh);
        const authorityRad = this.steerAngleDeg * (Math.PI / 180);

        // Smooth steering interpolation to prevent twitchy keyboard inputs
        const smoothAlpha = 1 - Math.exp(-VEHICLE_CONFIG.STEER_SMOOTH_RATE * dt);
        this.smoothedSteer = THREE.MathUtils.lerp(this.smoothedSteer, this.rawSteering, smoothAlpha);

        // ── Smooth Drift Evaluation ──
        const isHandbrake = handbrake && (absSpeed >= 6.0) && (Math.abs(this.smoothedSteer) > 0.1);
        const isHighSpeedTurn = (absSpeed >= VEHICLE_CONFIG.DRIFT_MIN_SPEED) && (Math.abs(this.smoothedSteer) > 0.40);

        let targetIntensity = 0;

        if (isHandbrake) {
            this.isDrifting = true;
            targetIntensity = 0.90;
            if (Math.abs(this.smoothedSteer) > 0.15) {
                this.driftDirection = Math.sign(this.smoothedSteer);
            }
        } else if (isHighSpeedTurn) {
            this.isDrifting = true;
            const speedRatio = THREE.MathUtils.clamp((absSpeed - 12.0) / 24.0, 0.2, 1.0);
            const steerRatio = THREE.MathUtils.clamp((Math.abs(this.smoothedSteer) - 0.40) / 0.50, 0.1, 1.0);
            targetIntensity = speedRatio * steerRatio * 0.75;

            // Only update drift direction if not actively in a deep drift
            if (this.driftIntensity < 0.25 || Math.abs(this.smoothedSteer) > 0.5) {
                this.driftDirection = Math.sign(this.smoothedSteer);
            }
        } else {
            this.isDrifting = false;
            targetIntensity = 0;
        }

        // Smoothly ramp drift intensity in and out
        const driftBlendRate = targetIntensity > this.driftIntensity ? 4.0 : 3.0;
        this.driftIntensity = THREE.MathUtils.lerp(
            this.driftIntensity,
            targetIntensity,
            1 - Math.exp(-driftBlendRate * dt)
        );

        // Gentle speed bleed during sustained drift
        if (this.driftIntensity > 0.15) {
            const bleed = this.forwardSpeed * VEHICLE_CONFIG.DRIFT_SPEED_LOSS_RATE * Math.abs(this.smoothedSteer) * dt;
            this.forwardSpeed = Math.max(0, this.forwardSpeed - bleed);
        }

        // Counter-steering responsiveness
        let steerMultiplier = 1.0;
        if (this.driftIntensity > 0.15) {
            const isCounter = (Math.sign(this.smoothedSteer) !== 0) && (Math.sign(this.smoothedSteer) !== this.driftDirection);
            if (isCounter) {
                steerMultiplier = VEHICLE_CONFIG.COUNTER_STEER_BONUS;
            }
        }

        // Apply smooth, gentle rotational yaw rate
        if (absSpeed > 0.2) {
            const directionSign = this.forwardSpeed >= 0 ? 1 : -1;
            const driftYawBoost = 1.0 + (this.driftIntensity * 0.25);
            const yawRate = -this.smoothedSteer * (authorityRad / 0.35) * VEHICLE_CONFIG.BASE_STEER_RATE * steerMultiplier * driftYawBoost;

            carObject.rotation.y += yawRate * directionSign * dt;
        }
    }

    // ── 3. Velocity & Motion Decomposition ────────────────────────────────────

    _integrateMotion(dt, carObject) {
        // Forward and right unit vectors from car orientation
        this._fwd.set(0, 0, 1).applyQuaternion(carObject.quaternion).normalize();
        this._side.set(1, 0, 0).applyQuaternion(carObject.quaternion).normalize();

        // Decompose existing lateral velocity
        let lateralVel = this.velocity.dot(this._side);

        // Smooth lateral grip damping
        const normalGrip = VEHICLE_CONFIG.NORMAL_LATERAL_GRIP;
        const driftGrip = 0.84;
        const activeGrip = THREE.MathUtils.lerp(normalGrip, driftGrip, this.driftIntensity);
        let dampedLateral = lateralVel * Math.pow(activeGrip, dt * 60);

        // Gentle outward lateral slide during drift
        if (this.driftIntensity > 0.1) {
            const targetSlip = -this.driftDirection * Math.abs(this.forwardSpeed) * 0.14 * this.driftIntensity;
            dampedLateral = THREE.MathUtils.lerp(dampedLateral, targetSlip, 1 - Math.exp(-4.0 * dt));
        }

        // Reconstruct velocity
        this.velocity
            .copy(this._fwd).multiplyScalar(this.forwardSpeed)
            .addScaledVector(this._side, dampedLateral);

        // Advance car position
        carObject.position.addScaledVector(this.velocity, dt);
    }

    // ── 4. Barrier Collision Response ─────────────────────────────────────────

    applyBarrierImpact(impactNormal, penetration, severity, dt) {
        this.lastImpactSeverity = severity;
        this.isScrapingBarrier = true;

        // Scale speed loss based on impact severity (glancing scrape: 5 km/h, hard hit: 26 km/h)
        const speedLoss = THREE.MathUtils.lerp(
            VEHICLE_CONFIG.BARRIER_SCRAPE_LOSS_MIN,
            VEHICLE_CONFIG.BARRIER_IMPACT_LOSS_MAX,
            severity
        );

        if (this.forwardSpeed > 0) {
            this.forwardSpeed = Math.max(0, this.forwardSpeed - speedLoss);
        }

        // Apply progressive sliding friction
        if (dt) {
            this.forwardSpeed = Math.max(0, this.forwardSpeed - VEHICLE_CONFIG.BARRIER_SLIDE_FRICTION * dt);
        }
    }

    // ── Telemetry & Normalized Getters ────────────────────────────────────────

    get speedKmh() {
        return Math.abs(this.forwardSpeed) * 3.6;
    }

    get speedNormalized() {
        return THREE.MathUtils.clamp(Math.abs(this.forwardSpeed) / VEHICLE_CONFIG.MAX_SPEED, 0, 1);
    }

    get speed() {
        return this.forwardSpeed;
    }
}
