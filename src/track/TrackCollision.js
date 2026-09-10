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

    const limit = track.halfWidth - 0.85;   // safe lateral boundary before barrier contact
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
    const severity = THREE.MathUtils.clamp((latVel + Math.abs(physics.forwardSpeed) * 0.15) / 12.0, 0.05, 1.0);

    // Apply speed penalty and slide friction through CarPhysics
    physics.applyBarrierImpact(normal, penetration, severity, delta);

    // Smoothly push car back inside drivable corridor (XZ only)
    const correction = penetration + 0.02;
    carMesh.position.x -= normal.x * sign * correction;
    carMesh.position.z -= normal.z * sign * correction;

    // Absorb and slightly reflect velocity away from barrier
    if (latVel > 0) {
        // Cancel incoming normal velocity and apply mild restitution
        const cancelAmount = latVel * (1.0 + VEHICLE_CONFIG.BARRIER_RESTITUTION);
        physics.velocity.addScaledVector(normal, -sign * cancelAmount);
    }

    // Align yaw gently toward track tangent to prevent crazy spins
    if (tangent) {
        const trackAngle = Math.atan2(tangent.x, tangent.z);
        // Normalize angle difference
        let angleDiff = trackAngle - carMesh.rotation.y;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        // Dampen angular deviation during barrier contact
        carMesh.rotation.y += angleDiff * VEHICLE_CONFIG.BARRIER_YAW_DAMPING * Math.min(delta * 6.0, 0.5);
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
 * preventBacktracking – invisible one-way start barrier.
 *
 * @param {THREE.Object3D} carMesh  – car root object
 * @param {Track}          track    – Track instance (has track.path)
 * @param {CarPhysics}     physics  – CarPhysics instance
 */
export function preventBacktracking(carMesh, track, physics) {
    if (!track || !track.path || !physics) return;

    // Start line world position and forward tangent (t=0).
    const startPos = track.path.getPointAt(0);
    const startTan = track.path.getTangentAt(0);

    // Signed distance along the start tangent from the start line to the car.
    const dx       = carMesh.position.x - startPos.x;
    const dz       = carMesh.position.z - startPos.z;
    const projDist = startTan.x * dx + startTan.z * dz;

    // Only enforce within 12 m of the start (doesn't affect the final approach).
    if (projDist >= 0 || projDist < -12) return;

    // Push car forward to the start line.
    const push = -projDist + 0.06;
    carMesh.position.x += startTan.x * push;
    carMesh.position.z += startTan.z * push;

    // Cancel backward velocity component
    const tanVec = new THREE.Vector3(startTan.x, 0, startTan.z);
    const backVel = physics.velocity.dot(tanVec);
    if (backVel < 0) {
        physics.velocity.x -= startTan.x * backVel;
        physics.velocity.z -= startTan.z * backVel;
        if (physics.forwardSpeed < 0) physics.forwardSpeed = 0;
    }
}

/**
 * preventFinishOvershoot – physical dead-end collision barrier at the finish line.
 * Stops the car from advancing past the finish line barrier.
 *
 * @param {THREE.Object3D} carMesh  – car root object
 * @param {Track}          track    – Track instance (has track.path)
 * @param {CarPhysics}     physics  – CarPhysics instance
 */
export function preventFinishOvershoot(carMesh, track, physics) {
    if (!track || !track.path || !physics) return;

    // Check if car is in the final sector approaching the finish line
    const { t } = track.path.closestPoint(carMesh.position);
    if (t < 0.88 || t > 0.96) return;

    const deadEndT = 0.916;
    const barrierPos = track.path.getPointAt(deadEndT);
    const barrierTan = track.path.getTangentAt(deadEndT);

    // Vector from barrier to car
    const dx = carMesh.position.x - barrierPos.x;
    const dz = carMesh.position.z - barrierPos.z;
    const projDist = barrierTan.x * dx + barrierTan.z * dz;

    // Stop distance: car center is held at 1.8m before the barrier face (accounting for front bumper)
    const stopDistance = -1.8;
    if (projDist > stopDistance) {
        const overshoot = projDist - stopDistance;
        carMesh.position.x -= barrierTan.x * overshoot;
        carMesh.position.z -= barrierTan.z * overshoot;

        // Cancel forward velocity into the barrier
        const forwardVel = physics.velocity.x * barrierTan.x + physics.velocity.z * barrierTan.z;
        if (forwardVel > 0) {
            physics.velocity.x -= barrierTan.x * forwardVel;
            physics.velocity.z -= barrierTan.z * forwardVel;
            if (physics.forwardSpeed > 0) {
                physics.forwardSpeed = 0;
            }
        }
    }
}

