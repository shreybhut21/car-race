import * as THREE from 'three';

/**
 * TrackPath – canonical spline-based path for NeonRacer.
 *
 * All track elements (road, barriers, neon, chevrons, lights, checkpoints)
 * are generated from this single source of truth.
 *
 * Public API
 * ----------
 *   path.totalLength          – arc-length in world units
 *   path.roadWidth            – drivable width (m)
 *   path.getPointAt(t)        – world position at normalised t ∈ [0,1]
 *   path.getTangentAt(t)      – unit forward vector at t
 *   path.getFrameAt(t)        – { position, tangent, normal, binormal, bankAngle }
 *   path.closestPoint(pos)    – { t, point, lateral, tangent, normal }
 */
export class TrackPath {
    constructor(mapConfig = null) {
        this.roadWidth  = 12;       // drivable surface width (m)
        this.halfWidth  = this.roadWidth / 2;
        this._arcDiv    = 1200;
        this._lutN      = 300;

        this.setMapConfig(mapConfig);
    }

    /**
     * Initializes or reconfigures the spline curve and banking from a map config.
     */
    setMapConfig(mapConfig) {
        const defaultPts = [
            new THREE.Vector3(   0,  0,    0),   //  0 – start/finish
            new THREE.Vector3(   0,  0,  110),   //  1 – long straight
            new THREE.Vector3(   0,  0,  200),   //  2 – straight end
            new THREE.Vector3(  55,  0,  270),   //  3 – sweeping right apex
            new THREE.Vector3( 120,  0,  310),   //  4 – right exit
            new THREE.Vector3( 155,  0,  370),   //  5 – S-curve right
            new THREE.Vector3( 130,  0,  420),   //  6 – S-curve left
            new THREE.Vector3(  80,  0,  450),   //  7 – S-curve exit
            new THREE.Vector3(  40,  1,  490),   //  8 – elevation start
            new THREE.Vector3(   0,  8,  540),   //  9 – bridge apex
            new THREE.Vector3( -55,  5,  570),   // 10 – bridge descent
            new THREE.Vector3(-120,  0,  550),   // 11 – fast left apex
            new THREE.Vector3(-160,  0,  490),   // 12 – fast left exit
            new THREE.Vector3(-155,  0,  400),   // 13 – final straight start
            new THREE.Vector3(-130,  0,  280),   // 14 – final straight
            new THREE.Vector3( -95,  0,  160),   // 15 – final straight
            new THREE.Vector3( -80,  0,   80),   // 16 – sweep left toward finish
            new THREE.Vector3( -55,  0,   15),   // 17 – final hairpin, well left of start
        ];

        const pts = (mapConfig && mapConfig.controlPoints) ? mapConfig.controlPoints : defaultPts;

        // Closed Catmull-Rom spline (tension 0.5 = classic Catmull-Rom)
        this.curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);

        // Arc-length cache – 1200 divisions gives < 0.2 m precision
        this._lengths = this.curve.getLengths(this._arcDiv);
        this.totalLength = this._lengths[this._arcDiv];

        const defaultBankZones = [
            { tStart: 0.10, tEnd: 0.25, maxBank:  0.08 },  // sweeping right
            { tStart: 0.30, tEnd: 0.40, maxBank: -0.06 },  // S left
            { tStart: 0.40, tEnd: 0.48, maxBank:  0.05 },  // S right
            { tStart: 0.58, tEnd: 0.70, maxBank: -0.09 },  // fast left
        ];

        this._bankZones = (mapConfig && mapConfig.bankZones) ? mapConfig.bankZones : defaultBankZones;

        // Lookup table for closestPoint – 300 points, ~4 m spacing, fast per-frame scan.
        this._lut = [];
        for (let i = 0; i <= this._lutN; i++) {
            const t = i / this._lutN;
            this._lut.push(this.curve.getPointAt(t));
        }
    }

    // ── Core queries ──────────────────────────────────────────────────────

    /** World position at normalised t ∈ [0,1]. */
    getPointAt(t) {
        return this.curve.getPointAt(t);
    }

    /** Unit tangent (forward direction) at t. */
    getTangentAt(t) {
        return this.curve.getTangentAt(t).normalize();
    }

    /**
     * Full Frenet-Serret frame at t, with optional road banking.
     * Returns { position, tangent, normal, binormal, bankAngle }.
     * `normal` points to the RIGHT of the road.
     */
    getFrameAt(t) {
        const tangent  = this.getTangentAt(t);
        const up       = new THREE.Vector3(0, 1, 0);
        const normal   = new THREE.Vector3().crossVectors(tangent, up).normalize();
        const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();

        // Banking: look up zone contribution, bell-shaped within zone.
        let bankAngle = 0;
        for (const z of this._bankZones) {
            if (t >= z.tStart && t <= z.tEnd) {
                const frac = (t - z.tStart) / (z.tEnd - z.tStart);
                // Sine envelope – smooth enter/exit.
                const envelope = Math.sin(frac * Math.PI);
                bankAngle += z.maxBank * envelope;
            }
        }

        const position = this.curve.getPointAt(t);

        return { position, tangent, normal, binormal, bankAngle };
    }

    /**
     * Given a world-space position, find the closest point on the track.
     * XZ-only distance is used so the car correctly finds its track position
     * even when below/above an elevated road section.
     * Returns { t, point, lateral, tangent, normal }
     *   lateral > 0 → car is to the RIGHT of centerline
     *   lateral < 0 → car is to the LEFT
     */
    closestPoint(worldPos) {
        // Step 1: coarse LUT scan – XZ only so elevation doesn't mislead us.
        let bestDist = Infinity;
        let bestIdx  = 0;
        for (let i = 0; i <= this._lutN; i++) {
            const lp = this._lut[i];
            const dx = worldPos.x - lp.x;
            const dz = worldPos.z - lp.z;
            const d  = dx * dx + dz * dz;
            if (d < bestDist) { bestDist = d; bestIdx = i; }
        }

        // Step 2: Newton refinement in XZ so we don't drift along elevation gradient.
        let t = bestIdx / this._lutN;
        const invLen = 1 / this.totalLength;

        for (let iter = 0; iter < 8; iter++) {
            const pt  = this.curve.getPointAt(t);
            const tan = this.getTangentAt(t);
            // Project offset and tangent onto XZ plane for the correction.
            const dx  = worldPos.x - pt.x;
            const dz  = worldPos.z - pt.z;
            const dot = tan.x * dx + tan.z * dz;
            t = THREE.MathUtils.clamp(t + dot * invLen, 0, 1);
        }

        const point   = this.curve.getPointAt(t);
        const tangent = this.getTangentAt(t);
        const up      = new THREE.Vector3(0, 1, 0);
        const normal  = new THREE.Vector3().crossVectors(tangent, up).normalize();

        // lateral: project XZ offset onto normal (ignores Y difference)
        const offset  = new THREE.Vector3(worldPos.x - point.x, 0, worldPos.z - point.z);
        const lateral = offset.dot(normal);   // + = right, - = left

        return { t, point, lateral, tangent, normal };
    }

    /**
     * Returns the bank-tilted "road up" vector at t.
     * Used to orient mesh cross-sections.
     */
    getBankedUp(t) {
        const { tangent, normal, bankAngle } = this.getFrameAt(t);
        const baseUp = new THREE.Vector3(0, 1, 0);
        // Rotate baseUp toward normal by bankAngle.
        const bankedUp = baseUp.clone()
            .addScaledVector(normal, Math.sin(bankAngle))
            .normalize();
        return bankedUp;
    }
}
