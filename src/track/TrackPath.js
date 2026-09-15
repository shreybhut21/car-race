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
        this._arcDiv    = 2400;     // 2400 divisions for sub-meter spline precision on 4.5km circuit
        this._lutN      = 800;      // 800-point LUT for zero-latency closest-point lookups

        this.setMapConfig(mapConfig);
    }

    /**
     * Initializes or reconfigures the spline curve and banking from a map config.
     */
    setMapConfig(mapConfig) {
        const pts = (mapConfig && mapConfig.controlPoints) ? mapConfig.controlPoints : [
            new THREE.Vector3( -900, 0,     0),
            new THREE.Vector3( -600, 0,     0),
            new THREE.Vector3( -420, 0,     0),
            new THREE.Vector3( -260, 0,  -130),
            new THREE.Vector3( -120, 0,  -150),
            new THREE.Vector3(   30, 0,   -90),
            new THREE.Vector3(  170, 0,    90),
            new THREE.Vector3(  310, 0,   140),
            new THREE.Vector3(  450, 0,   110),
            new THREE.Vector3(  590, 0,   -70),
            new THREE.Vector3(  720, 0,   -90),
            new THREE.Vector3(  860, 0,     0),
            new THREE.Vector3( 1000, 0,    60),
            new THREE.Vector3( 1180, 0,   180),
            new THREE.Vector3( 1380, 0,   420),
            new THREE.Vector3( 1450, 0,   700),
            new THREE.Vector3( 1450, 1,  1000),
            new THREE.Vector3( 1350, 2,  1300),
            new THREE.Vector3( 1150, 3,  1550),
            new THREE.Vector3(  900, 2,  1750),
            new THREE.Vector3(  650, 1,  1950),
            new THREE.Vector3(  450, 0,  2050),
            new THREE.Vector3(  280, 0,  2020),
            new THREE.Vector3(  120, 0,  2100),
            new THREE.Vector3(  -80, 0,  2060),
            new THREE.Vector3( -400, 0,  2060),
            new THREE.Vector3( -800, 0,  2060),
            new THREE.Vector3(-1200, 0,  2060),
            new THREE.Vector3(-1600, 0,  2060),
            new THREE.Vector3(-1850, 0,  1950),
            new THREE.Vector3(-2050, 1,  1750),
            new THREE.Vector3(-2150, 2,  1450),
            new THREE.Vector3(-2180, 3,  1100),
            new THREE.Vector3(-2100, 3,   750),
            new THREE.Vector3(-1900, 2,   450),
            new THREE.Vector3(-1650, 1,   220),
            new THREE.Vector3(-1400, 0,    80),
            new THREE.Vector3(-1180, 0,    10),
            new THREE.Vector3(-1020, 0,     0),
        ];

        // Closed Catmull-Rom spline (tension 0.5 = classic Catmull-Rom)
        this.curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);

        // Arc-length cache – 2400 divisions gives < 0.2 m precision
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
            t = ((t + dot * invLen) % 1.0 + 1.0) % 1.0;
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
