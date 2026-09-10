import * as THREE from 'three';
import { VEHICLE_CONFIG } from '../car/CarPhysics.js';

// ── Camera Modes Preset Configuration ─────────────────────────────────────────
export const CAMERA_MODES = [
    {
        id: 'horizon',
        name: 'Horizon Low',
        shortName: 'Horizon',
        keyNumber: '1',
        distance: 3,        // m behind car (tight framing)
        height: 1.50,         // m above road surface (low bumper level)
        lookAheadDist: 24.0,  // m ahead along road for horizon focus
        lookHeight: 1.25,     // m height of look-target
        baseFOV: 50,          // wide cinematic arcade FOV
        maxFOV: 70,           // FOV at top speed
        lerpRate: 0.16,       // follow responsiveness
    },
    {
        id: 'chase',
        name: 'High Chase',
        shortName: 'Chase',
        keyNumber: '2',
        distance: 6.8,        // classic high third-person distance
        height: 2.35,         // higher angle
        lookAheadDist: 20.0,
        lookHeight: 1.3,
        baseFOV: 62,
        maxFOV: 80,
        lerpRate: 0.14,
    },
    {
        id: 'hood',
        name: 'Bumper / Hood',
        shortName: 'Bumper',
        keyNumber: '3',
        distance: -0.6,       // mounted on front hood
        height: 0.9,
        lookAheadDist: 32.0,
        lookHeight: 0.85,
        baseFOV: 78,
        maxFOV: 96,
        lerpRate: 0.28,
    },
    {
        id: 'aerial',
        name: 'Helicopter Aerial',
        shortName: 'Aerial',
        keyNumber: '4',
        distance: 12.0,       // far behind & above
        height: 8.5,
        lookAheadDist: 10.0,
        lookHeight: 0.5,
        baseFOV: 55,
        maxFOV: 65,
        lerpRate: 0.10,
    }
];

export class ChaseCamera {
    constructor(camera, car) {
        this.camera = camera;
        this.car    = car;

        this.currentModeIndex = 0; // Default: Horizon Low
        this.activeConfig = { ...CAMERA_MODES[0] };

        this.desiredPosition    = new THREE.Vector3();
        this.smoothedLookTarget = new THREE.Vector3();
        this.forward            = new THREE.Vector3();
        this.offset             = new THREE.Vector3();
        this.worldRotation      = new THREE.Quaternion();
        this.recoveryDir        = new THREE.Vector3();

        this.initialized = false;
        this.onModeChangeCallbacks = [];
    }

    onModeChange(fn) {
        this.onModeChangeCallbacks.push(fn);
    }

    getCurrentMode() {
        return CAMERA_MODES[this.currentModeIndex];
    }

    cycleMode() {
        const nextIndex = (this.currentModeIndex + 1) % CAMERA_MODES.length;
        this.setMode(nextIndex);
        return this.getCurrentMode();
    }

    setMode(indexOrId) {
        let targetIndex = 0;
        if (typeof indexOrId === 'number') {
            targetIndex = THREE.MathUtils.clamp(indexOrId, 0, CAMERA_MODES.length - 1);
        } else if (typeof indexOrId === 'string') {
            const idx = CAMERA_MODES.findIndex(m => m.id === indexOrId || m.name === indexOrId || m.keyNumber === indexOrId);
            if (idx !== -1) targetIndex = idx;
        }

        this.currentModeIndex = targetIndex;
        const mode = CAMERA_MODES[this.currentModeIndex];

        for (const cb of this.onModeChangeCallbacks) {
            try { cb(mode, this.currentModeIndex); } catch (e) { console.error(e); }
        }

        return mode;
    }

    update(delta) {
        if (!this.car?.object) return;

        const car        = this.car.object;
        const speedRatio = this.car.speedNormalized !== undefined
            ? this.car.speedNormalized
            : THREE.MathUtils.clamp(Math.abs(this.car.controller?.speed || 0) / VEHICLE_CONFIG.MAX_SPEED, 0, 1);
        const time       = performance.now() * 0.001;

        // Smooth transition towards active mode parameters
        const targetMode = CAMERA_MODES[this.currentModeIndex];
        const blendSpeed = 1 - Math.exp(-6.0 * delta);

        this.activeConfig.distance      = THREE.MathUtils.lerp(this.activeConfig.distance, targetMode.distance, blendSpeed);
        this.activeConfig.height        = THREE.MathUtils.lerp(this.activeConfig.height, targetMode.height, blendSpeed);
        this.activeConfig.lookAheadDist = THREE.MathUtils.lerp(this.activeConfig.lookAheadDist, targetMode.lookAheadDist, blendSpeed);
        this.activeConfig.lookHeight    = THREE.MathUtils.lerp(this.activeConfig.lookHeight, targetMode.lookHeight, blendSpeed);
        this.activeConfig.baseFOV       = THREE.MathUtils.lerp(this.activeConfig.baseFOV, targetMode.baseFOV, blendSpeed);
        this.activeConfig.maxFOV        = THREE.MathUtils.lerp(this.activeConfig.maxFOV, targetMode.maxFOV, blendSpeed);
        this.activeConfig.lerpRate      = THREE.MathUtils.lerp(this.activeConfig.lerpRate, targetMode.lerpRate, blendSpeed);

        car.getWorldQuaternion(this.worldRotation);

        // ── Desired camera position ───────────────────────────────────────
        // Dynamic speed shake and distance reaction
        const shake = speedRatio * speedRatio;
        const dynamicDistance = this.activeConfig.distance > 0
            ? this.activeConfig.distance + (speedRatio * 0.45)
            : this.activeConfig.distance;

        this.offset.set(
            Math.sin(time * 18.0) * 0.006 * shake,
            this.activeConfig.height + Math.sin(time * 13.0) * 0.004 * shake,
            -dynamicDistance
        ).applyQuaternion(this.worldRotation);

        this.desiredPosition.copy(car.position).add(this.offset);

        // ── Desired look-target ───────────────────────────────────────────
        this.forward.set(0, 0, 1).applyQuaternion(this.worldRotation).normalize();

        const lookTarget = car.position.clone()
            .addScaledVector(this.forward, this.activeConfig.lookAheadDist);
        lookTarget.y += this.activeConfig.lookHeight;

        // ── Apply with lerp ───────────────────────────────────────────────
        if (!this.initialized) {
            this.camera.position.copy(this.desiredPosition);
            this.smoothedLookTarget.copy(lookTarget);
            this.initialized = true;
        } else {
            // Frame-rate-independent lerp: lerpRate is tuned for 60 fps so scale by dt.
            const alpha = 1 - Math.pow(1 - this.activeConfig.lerpRate, delta * 60);
            this.camera.position.lerp(this.desiredPosition, alpha);

            // Clamp maximum lag so the car never escapes the frustum.
            const maxLag = THREE.MathUtils.lerp(1.8, 1.1, speedRatio);
            const err    = this.camera.position.distanceTo(this.desiredPosition);
            if (err > maxLag) {
                this.recoveryDir
                    .copy(this.camera.position)
                    .sub(this.desiredPosition)
                    .normalize();
                this.camera.position
                    .copy(this.desiredPosition)
                    .addScaledVector(this.recoveryDir, maxLag);
            }

            // Look-target lags slightly behind position for a natural feel.
            this.smoothedLookTarget.lerp(lookTarget, alpha * 0.85);
        }

        this.camera.lookAt(this.smoothedLookTarget);

        // Dynamic speed-based FOV curve matching:
        // 0-60 km/h: base FOV, 100 km/h: wider, 150 km/h: wider, 180 km/h: max FOV
        const fovProgress = Math.pow(speedRatio, 1.25);
        const targetFov = THREE.MathUtils.lerp(
            this.activeConfig.baseFOV,
            this.activeConfig.maxFOV,
            fovProgress
        );
        this.camera.fov = THREE.MathUtils.lerp(
            this.camera.fov,
            targetFov,
            1 - Math.exp(-4 * delta)
        );
        this.camera.updateProjectionMatrix();
    }
}
