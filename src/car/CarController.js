import * as THREE from 'three';
import { CarPhysics } from './CarPhysics.js';
import { keepCarOnTrack, snapToRoadSurface, preventBacktracking, preventFinishOvershoot } from '../track/TrackCollision.js';

export class CarController {
    constructor(carObject, input, track) {
        this.carObject = carObject;
        this.input     = input;
        this.track     = track;

        // Modular physics engine
        this.physics = new CarPhysics();
    }

    update(delta) {
        // 1. Step the vehicle physics
        this.physics.update(delta, this.input, this.carObject);

        // 2. Resolve track collisions, road elevation & boundaries
        this.resolveTrackInteractions(delta);
    }

    resolveTrackInteractions(delta) {
        if (!this.track) return;
        keepCarOnTrack(this.carObject, this.track, this.physics, delta);
        snapToRoadSurface(this.carObject, this.track);
        preventBacktracking(this.carObject, this.track, this.physics);
        preventFinishOvershoot(this.carObject, this.track, this.physics);
    }


    // ── Public Getters for Telemetry, Camera, Audio & HUD ──────────────────────

    /** Forward speed in m/s (+ = forward, - = reverse) */
    get speed() {
        return this.physics.forwardSpeed;
    }

    /** Absolute speed in km/h for speedometer display */
    get speedKmh() {
        return this.physics.speedKmh;
    }

    /** Normalized speed ratio (0.0 to 1.0) based on max forward speed (180 km/h) */
    get speedNormalized() {
        return this.physics.speedNormalized;
    }

    /** World-space velocity vector (m/s) */
    get velocity() {
        return this.physics.velocity;
    }

    /** Whether the vehicle is currently in a handbrake drift */
    get isDrifting() {
        return this.physics.isDrifting;
    }

    /** Current steering input / authority */
    get currentSteer() {
        return this.physics.smoothedSteer;
    }
}
