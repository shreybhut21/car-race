import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════════════════
//  NEON RACER - VEHICLE PHYSICS TUNING CONFIGURATION (HORIZON DRIVE ARCADE FEEL)
// ═══════════════════════════════════════════════════════════════════════════════

export const VEHICLE_CONFIG = {
    // ═══════════════════════════════════════════════════════════════════════════════
    // 🏎️ 1. SPEED & TOP VELOCITY (Change these to make the car faster / slower)
    // ═══════════════════════════════════════════════════════════════════════════════
    // 👉 INCREASE THIS to increase forward MAX TOP SPEED (e.g. 50 = 180 km/h, 72 = 260 km/h, 110 = 396 km/h)
    MAX_SPEED: 50.0,            // Top speed in meters/second (multiply by 3.6 to get 180.0 km/h)

    // 👉 INCREASE THIS to make REVERSE top speed faster (e.g. 11.1 = 40 km/h)
    MAX_REVERSE_SPEED: 11.1,    // Reverse top speed in meters/second

    // ═══════════════════════════════════════════════════════════════════════════════
    // ⚡ 2. ACCELERATION (Change these to make car pick up speed faster or slower)
    // ═══════════════════════════════════════════════════════════════════════════════
    // 👉 INCREASE THIS NUMBER TO ACCELERATE FASTER from 0 km/h (Higher = instant rocket boost, Lower = slower gradual pickup)
    ACCEL_BASE: 8.0,            // Base acceleration rate in m/s²

    // 👉 Exponent that controls how power tapers off near top speed (1.0 = linear, 1.5 = softer top end)
    ACCEL_EXPONENT: 1.32,

    // 👉 INCREASE THIS to make reverse acceleration faster when backing up
    REVERSE_ACCEL: 3.8,         // Reverse acceleration in m/s²

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🛑 3. BRAKING & COASTING (Change these to stop faster or glide longer)
    // ═══════════════════════════════════════════════════════════════════════════════
    // 👉 INCREASE THIS NUMBER TO BRAKE FASTER when pressing 'S' or Down Arrow
    BRAKE_DECEL: 10.5,          // Foot brake strength in m/s²

    // 👉 INCREASE THIS NUMBER for stronger emergency HANDBRAKE when pressing Spacebar
    HANDBRAKE_DECEL: 18.0,      // Spacebar handbrake strength in m/s²

    // 👉 Natural friction when letting go of gas (0.995 = glides far, 0.980 = slows quickly)
    COAST_DRAG: 0.990,          // Drag multiplier per frame
    ROLLING_RESISTANCE: 0.25,   // Rolling friction

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🔄 4. STEERING & TURNING (A/D & LEFT/RIGHT ARROW KEYS)
    // ═══════════════════════════════════════════════════════════════════════════════
    // 👉 INCREASE THIS NUMBER TO TURN LEFT / RIGHT FASTER (Higher = sharp instant turns, Lower = smooth gentle turns)
    BASE_STEER_RATE: 1.0,       // Base steering turning multiplier
    STEER_SMOOTH_RATE: 6.8,     // Higher = immediate snap turning, Lower = smoother delayed steering

    // 👉 MAXIMUM TURNING ANGLE AT DIFFERENT SPEEDS:
    // Change angleDeg to control how sharply the car turns at 0, 50, 100, 150, 180 km/h.
    STEER_AUTHORITY_CURVE: [
        { speedKmh: 0, angleDeg: 20.0 },   // Max turn sharpness at 0 km/h
        { speedKmh: 50, angleDeg: 15.0 },  // Max turn sharpness at 50 km/h
        { speedKmh: 100, angleDeg: 11.0 }, // Max turn sharpness at 100 km/h
        { speedKmh: 150, angleDeg: 9.0 },  // Max turn sharpness at 150 km/h
        { speedKmh: 180, angleDeg: 8.0 },  // Max turn sharpness at 180 km/h (top speed)
    ],

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🛞 5. TIRE GRIP & DRIFTING (Change how much the car grips the road or slides)
    // ═══════════════════════════════════════════════════════════════════════════════
    // 👉 INCREASE THIS (up to 0.99) for MORE TIRE GRIP (rails-like grip, less sliding)
    NORMAL_LATERAL_GRIP: 0.7, // Tire grip on asphalt (0.90 = slippery, 0.98 = glued to road)
    HIGH_SPEED_GRIP_LOSS: 0.2,

    // Drift settings (when holding Space or making sharp high speed turns):
    // 👉 Minimum speed required to trigger high speed drift (in m/s: 12 = ~43 km/h)
    DRIFT_MIN_SPEED: 12.0,
    DRIFT_FULL_SPEED: 28.0,
    // 👉 Grip level while drifting (Lower = wider longer slides, Higher = tight controlled slides)
    DRIFT_LATERAL_GRIP: 0.72,
    // 👉 How much the rear tail kicks out sideways during drift
    DRIFT_YAW_BOOST: 2.1,
    // 👉 Speed lost while sliding sideways
    DRIFT_SPEED_LOSS_RATE: 0.035,
    // 👉 Time in seconds to recover full straight grip after releasing drift
    DRIFT_RECOVERY_TIME: 0.45,
    // 👉 Counter-steering responsiveness when correcting a slide
    COUNTER_STEER_BONUS: 1.75,

    // ═══════════════════════════════════════════════════════════════════════════════
    // 💥 6. BARRIER WALL CRASHES & IMPACTS
    // ═══════════════════════════════════════════════════════════════════════════════
    BARRIER_SCRAPE_LOSS_MIN: 1.4,   // Speed loss (m/s) on light wall scrape
    BARRIER_IMPACT_LOSS_MAX: 7.2,   // Speed loss (m/s) on direct hard wall impact
    BARRIER_RESTITUTION: 0.18,      // Bounce off walls (Lower = slides along wall)
    BARRIER_SLIDE_FRICTION: 2.8,    // Friction while scraping against barriers
    BARRIER_YAW_DAMPING: 0.75,      // Prevents car from spinning out when hitting walls

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🚧 7. OFF-TRACK PENALTY (Leaving the road)
    // ═══════════════════════════════════════════════════════════════════════════════
    OFF_TRACK_GRIP_MULT: 0.72,      // Reduced grip off-road
    OFF_TRACK_DECEL: 4.5,           // Extra slowdown off-road
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
        const throttleInput = input.throttle; // +1 (W/Up Key), -1 (S/Down Key), 0 (none)
        const handbrake = input.handbrake;     // Space bar

        if (throttleInput > 0) {
            // [ W / Up Arrow ]: Accelerate forward
            if (this.forwardSpeed < 0) {
                // Braking while reversing
                this.forwardSpeed += VEHICLE_CONFIG.BRAKE_DECEL * 1.5 * dt;
                if (this.forwardSpeed > 0) this.forwardSpeed = 0;
            } else {
                // Accelerating forward: uses ACCEL_BASE and MAX_SPEED from VEHICLE_CONFIG above
                const speedRatio = Math.max(0, this.forwardSpeed / VEHICLE_CONFIG.MAX_SPEED);
                const accelFactor = Math.max(0.10, Math.pow(Math.max(0, 1 - speedRatio), VEHICLE_CONFIG.ACCEL_EXPONENT));
                const accel = VEHICLE_CONFIG.ACCEL_BASE * accelFactor;
                this.forwardSpeed = Math.min(this.forwardSpeed + accel * dt, VEHICLE_CONFIG.MAX_SPEED);
            }
        } else if (throttleInput < 0) {
            // [ S / Down Arrow ]: Brake when moving forward, Reverse when stopped
            if (this.forwardSpeed > 0.4) {
                // Moving forward: uses BRAKE_DECEL from VEHICLE_CONFIG
                this.forwardSpeed = Math.max(this.forwardSpeed - VEHICLE_CONFIG.BRAKE_DECEL * dt, 0);
            } else {
                // Reversing: uses REVERSE_ACCEL and MAX_REVERSE_SPEED from VEHICLE_CONFIG
                this.forwardSpeed = Math.max(
                    this.forwardSpeed - VEHICLE_CONFIG.REVERSE_ACCEL * dt,
                    -VEHICLE_CONFIG.MAX_REVERSE_SPEED
                );
            }
        } else {
            // Coasting: natural drag when no keys are pressed
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

        // [ Space Bar ]: Emergency Handbrake
        if (handbrake && Math.abs(this.forwardSpeed) > 0.05) {
            const sign = Math.sign(this.forwardSpeed);
            this.forwardSpeed = Math.max(0, Math.abs(this.forwardSpeed) - VEHICLE_CONFIG.HANDBRAKE_DECEL * dt) * sign;
        }
    }

    // ── 2. Steering, Yaw & Drift Calculation ──────────────────────────────────

    _updateSteeringAndDrift(dt, input, carObject) {
        this.rawSteering = input.steering; // -1 (A / Left Arrow = Turn Left), +1 (D / Right Arrow = Turn Right)
        const handbrake = input.handbrake;
        const absSpeed = Math.abs(this.forwardSpeed);
        const speedKmh = absSpeed * 3.6;

        // Steering angle authority based on current car speed
        this.steerAngleDeg = this.getSteeringAuthority(speedKmh);
        const authorityRad = this.steerAngleDeg * (Math.PI / 180);

        // Smooth steering rate (uses STEER_SMOOTH_RATE from VEHICLE_CONFIG)
        const smoothAlpha = 1 - Math.exp(-VEHICLE_CONFIG.STEER_SMOOTH_RATE * dt);
        this.smoothedSteer = THREE.MathUtils.lerp(this.smoothedSteer, this.rawSteering, smoothAlpha);

        // ── Drift Evaluation ──
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

            if (this.driftIntensity < 0.25 || Math.abs(this.smoothedSteer) > 0.5) {
                this.driftDirection = Math.sign(this.smoothedSteer);
            }
        } else {
            this.isDrifting = false;
            targetIntensity = 0;
        }

        // Smoothly blend drift intensity in and out
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

        // Counter-steering responsiveness bonus
        let steerMultiplier = 1.0;
        if (this.driftIntensity > 0.15) {
            const isCounter = (Math.sign(this.smoothedSteer) !== 0) && (Math.sign(this.smoothedSteer) !== this.driftDirection);
            if (isCounter) {
                steerMultiplier = VEHICLE_CONFIG.COUNTER_STEER_BONUS;
            }
        }

        // 🔄 TURN LEFT / RIGHT: Applies turning yaw rotation to the car
        // (Uses BASE_STEER_RATE and STEER_AUTHORITY_CURVE from VEHICLE_CONFIG)
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
        const wasScraping = this.isScrapingBarrier;
        this.isScrapingBarrier = true;
        this.lastImpactSeverity = severity;

        // Apply a small speed penalty only on initial impact (not every frame)
        if (!wasScraping) {
            const speedLoss = THREE.MathUtils.lerp(
                VEHICLE_CONFIG.BARRIER_SCRAPE_LOSS_MIN,
                VEHICLE_CONFIG.BARRIER_IMPACT_LOSS_MAX,
                severity
            );
            if (this.forwardSpeed > 0) {
                this.forwardSpeed = Math.max(5.0, this.forwardSpeed - speedLoss);
            }
        }

        // Apply smooth sliding friction proportional to delta time so car doesn't freeze
        if (dt && this.forwardSpeed > 0) {
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
