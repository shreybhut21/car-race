import * as THREE from 'three';
import { VEHICLE_CONFIG } from '../car/CarPhysics.js';

/**
 * keepCarOnTrack – spline-relative lateral barrier collision and scraping physics.
 *
 * Implements:
 *  1. Precise barrier contact detection based on road half-width.
 *  2. Impact severity calculation and proportional speed penalty (light scrape 5 km/h, hard hit ~26 km/h).
 *  3. Normal velocity absorption & slight restitution (no stick, no crazy bounce).
 *  4. Tangential barrier sliding without clipping or locking.
 *  5. Yaw stabilization preventing random 180° spins or roll explosions.
 *  6. Off-track gentle corridor recovery.
 *
 * @param {THREE.Object3D} carMesh  – the car's root Object3D (position modified)
 * @param {Track}          track    – Track instance (has track.path and track.halfWidth)
 * @param {CarPhysics}     physics  – CarPhysics instance (speed & velocity updated)
 * @param {number}         delta    – frame delta time in seconds
 */
export function keepCarOnTrack(carMesh, track, physics, delta) {
    if (!track || !track.path || !physics) return;

    const limit = track.halfWidth - 0.45;   // safe lateral boundary before barrier contact
    const { point, lateral, normal, tangent } = track.path.closestPoint(carMesh.position);
    const absLat = Math.abs(lateral);

    if (absLat <= limit) {
        physics.isScrapingBarrier = false;
        return;
    }

    const sign = Math.sign(lateral);
    const penetration = absLat - limit;

    // Lateral velocity component pointing into the barrier
    const latVel = physics.velocity.dot(normal) * sign;
    const severity = THREE.MathUtils.clamp((latVel + Math.abs(physics.forwardSpeed) * 0.10) / 10.0, 0.05, 1.0);

    // Apply speed penalty and slide friction through CarPhysics
    physics.applyBarrierImpact(normal, penetration, severity, delta);

    // Smoothly keep car inside drivable corridor without jerky teleports
    const correction = Math.min(penetration, 0.35);
    carMesh.position.x -= normal.x * sign * correction;
    carMesh.position.z -= normal.z * sign * correction;

    // Absorb lateral velocity into the wall
    if (latVel > 0) {
        const cancelAmount = latVel * (1.0 + VEHICLE_CONFIG.BARRIER_RESTITUTION);
        physics.velocity.addScaledVector(normal, -sign * cancelAmount);
    }

    // Align yaw gently toward track tangent to prevent crazy spins
    if (tangent) {
        const trackAngle = Math.atan2(tangent.x, tangent.z);
        let angleDiff = trackAngle - carMesh.rotation.y;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        carMesh.rotation.y += angleDiff * VEHICLE_CONFIG.BARRIER_YAW_DAMPING * Math.min(delta * 4.0, 0.3);
    }
}

/**
 * snapToRoadSurface – keeps the car's Y glued to the road elevation.
 *
 * @param {THREE.Object3D} carMesh – the car's root Object3D
 * @param {Track}          track   – Track instance
 */
export function snapToRoadSurface(carMesh, track) {
    if (!track || !track.path) return;

    const { point } = track.path.closestPoint(carMesh.position);
    // The car sits 0.46 m above the road centreline (scaled wheel radius).
    const targetY = point.y + 0.46;
    // Smooth exponential lerp – fast enough to feel instant, slow enough to avoid jitter.
    carMesh.position.y = THREE.MathUtils.lerp(carMesh.position.y, targetY, 0.25);
}

/**
 * preventBacktracking – no artificial invisible barriers.
 */
export function preventBacktracking(carMesh, track, physics) {
    // Open circuit: no artificial invisible walls blocking drive line
    return;
}

/**
 * preventFinishOvershoot – stops the car at the physical finish hazard barricade.
 *
 * @param {THREE.Object3D} carMesh  – car root object
 * @param {Track}          track    – Track instance (has track.path)
 * @param {CarPhysics}     physics  – CarPhysics instance
 */
export function preventFinishOvershoot(carMesh, track, physics) {
    if (!track || !track.path || !physics) return;

    const { t, lateral } = track.path.closestPoint(carMesh.position);

    // Strictly enforce ONLY at the final terminus of the lap (t >= 0.978)
    if (t < 0.978) return;

    const deadEndPos = track.path.getPointAt(0.985);
    const deadEndTan = track.path.getTangentAt(0.985);

    const dx = carMesh.position.x - deadEndPos.x;
    const dz = carMesh.position.z - deadEndPos.z;
    const distSq = dx * dx + dz * dz;

    // Must be physically within 18m of the barricade mesh on the road
    if (distSq > 18 * 18) return;

    const projDist = deadEndTan.x * dx + deadEndTan.z * dz;

    // Stop car only at the barricade face
    if (projDist >= -1.0 && projDist < 6.0 && Math.abs(lateral) <= track.halfWidth + 2.0) {
        const clampOffset = projDist + 1.0;
        carMesh.position.x -= deadEndTan.x * clampOffset;
        carMesh.position.z -= deadEndTan.z * clampOffset;

        if (physics.forwardSpeed > 0) {
            physics.forwardSpeed = 0;
            physics.velocity.set(0, 0, 0);
        }
    }
}

