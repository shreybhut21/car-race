import * as THREE from 'three';
import { TrackPath } from './TrackPath.js';

/**
 * Track – generates every visual track element from TrackPath.
 *
 * Elements produced
 * -----------------
 *  • road surface (smooth ribbon geometry)
 *  • shoulders
 *  • lane markings (dashed)
 *  • left/right barriers (body + neon rails + supports)
 *  • neon edge strips (continuous ribbon)
 *  • chevron signs (tangent-oriented, density varies by curvature)
 *  • street lights (InstancedMesh)
 *  • start/finish line (perpendicular to spline at t=0)
 */
export class Track {
    constructor(scene, mapConfig = null) {
        this.scene      = scene;
        this.mapConfig  = mapConfig;
        this.path       = new TrackPath(mapConfig);
        this.roadWidth  = this.path.roadWidth;       // 12 m
        this.halfWidth  = this.path.halfWidth;       //  6 m
        this._steps     = 300;

        // Container group to allow clean map reloading
        this.trackGroup = new THREE.Group();
        this.scene.add(this.trackGroup);

        this._build();
    }

    /**
     * Rebuilds the entire track for a new map configuration.
     */
    loadMap(mapConfig) {
        this.mapConfig = mapConfig;

        // Clean up previous track elements
        while (this.trackGroup.children.length > 0) {
            const child = this.trackGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
            this.trackGroup.remove(child);
        }

        // Update spline path
        this.path.setMapConfig(mapConfig);
        this.roadWidth = this.path.roadWidth;
        this.halfWidth = this.path.halfWidth;

        // Rebuild all track elements with map theme
        this._build();
    }

    // ── Public API ────────────────────────────────────────────────────────

    /**
     * Returns track-relative boundary info for a world position.
     * Used by TrackCollision.js instead of the old getBounds().
     */
    getBoundsAtPoint(worldPos) {
        const { t, point, lateral, tangent, normal } = this.path.closestPoint(worldPos);
        return { t, point, lateral, tangent, normal, halfWidth: this.halfWidth };
    }

    // ── Build pipeline ────────────────────────────────────────────────────

    _build() {
        this._createRoad();
        this._createShoulders();
        this._createLaneMarkings();
        this._createNeonEdgeStrips();
        this._createBarriers();
        this._createChevrons();
        this._createStreetLights();
        this._createStartLine();
        this._createFinishLine();
        this._createBarrierSpillLights();
    }

    // ── Shared geometry helpers ───────────────────────────────────────────

    /**
     * Builds an indexed ribbon BufferGeometry by sweeping a cross-section
     * along the spline.
     *
     * @param {number} steps    – number of longitudinal subdivisions
     * @param {number} offsetL  – left-edge lateral offset from centre
     * @param {number} offsetR  – right-edge lateral offset from centre
     * @param {Function} yBias  – optional fn(t) → extra Y offset (for neon on top of road)
     */
    _buildRibbon(steps, offsetL, offsetR, yBias = null) {
        const positions = [];
        const normals   = [];
        const uvs       = [];
        const indices   = [];

        const oL = Math.min(offsetL, offsetR);
        const oR = Math.max(offsetL, offsetR);

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const { position, tangent, normal, binormal, bankAngle } = this.path.getFrameAt(t);

            const yExtra = yBias ? yBias(t) : 0;

            // Left vertex
            const posL = position.clone()
                .addScaledVector(normal, oL)
                .setY(position.y + yExtra);
            // Right vertex
            const posR = position.clone()
                .addScaledVector(normal, oR)
                .setY(position.y + yExtra);

            const u = i / steps;

            positions.push(posL.x, posL.y, posL.z,  posR.x, posR.y, posR.z);
            normals.push(0, 1, 0,  0, 1, 0);
            uvs.push(0, u,  1, u);
        }

        for (let i = 0; i < steps; i++) {
            const a = i * 2;
            const b = a + 1;
            const c = a + 2;
            const d = a + 3;
            indices.push(a, b, c,  b, d, c);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normals,   3));
        geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs,       2));
        geo.setIndex(indices);
        geo.computeVertexNormals();
        return geo;
    }

    // ── Road ──────────────────────────────────────────────────────────────

    _createRoad() {
        const material = new THREE.MeshPhysicalMaterial({
            color:              0x11151d,
            roughness:          0.20,
            metalness:          0.30,
            clearcoat:          0.82,
            clearcoatRoughness: 0.12,
            reflectivity:       0.58,
        });
        const geo  = this._buildRibbon(this._steps, -this.halfWidth, this.halfWidth);
        const road = new THREE.Mesh(geo, material);
        road.receiveShadow = true;
        road.name = 'Road';
        this.trackGroup.add(road);

        // Road-wear (tyre-track darkening strips at ±4 m from centre)
        const wearMat = new THREE.MeshBasicMaterial({
            color: 0x020308, transparent: true, opacity: 0.15, depthWrite: false,
        });
        const wearOffsets = [-4.15, -1.85, 1.85, 4.15];
        for (const ox of wearOffsets) {
            const wearGeo  = this._buildRibbon(this._steps, ox - 0.26, ox + 0.26, () => 0.004);
            const wearMesh = new THREE.Mesh(wearGeo, wearMat);
            wearMesh.renderOrder = 1;
            this.trackGroup.add(wearMesh);
        }
    }

    // ── Shoulders ─────────────────────────────────────────────────────────

    _createShoulders() {
        const material = new THREE.MeshStandardMaterial({
            color: 0x171725, roughness: 0.36, metalness: 0.7,
        });
        for (const side of [-1, 1]) {
            const inner = side * (this.halfWidth);
            const outer = side * (this.halfWidth + 1.8);
            const geo   = this._buildRibbon(this._steps, Math.min(inner, outer), Math.max(inner, outer), () => -0.04);
            const mesh  = new THREE.Mesh(geo, material);
            mesh.receiveShadow = true;
            this.trackGroup.add(mesh);
        }
    }

    // ── Lane markings ─────────────────────────────────────────────────────

    _createLaneMarkings() {
        const emissiveColor = this.mapConfig?.theme?.laneEmissiveHex || 0x4d2b68;
        const material = new THREE.MeshStandardMaterial({
            color:             0xf8eaff,
            emissive:          emissiveColor,
            emissiveIntensity: 0.6,
            roughness:         0.22,
            metalness:         0.35,
        });

        const laneOffset = this.roadWidth / 3;    // ±4 m from centre
        const dashLen    = 4.8;
        const dashGap    = 7.2;                   // 12 m repeat
        const dashWidth  = 0.12;

        for (const lateralOffset of [-laneOffset / 2, laneOffset / 2]) {
            let distAccum = 0;
            let dashPhase = 0;
            let dashStart = 0;

            const totalLen = this.path.totalLength;
            const step     = totalLen / this._steps;

            const positions = [];
            const norms     = [];
            const uvArr     = [];
            const idxArr    = [];
            let   vtx       = 0;

            const commitDash = (tStart, tEnd) => {
                const segs = Math.max(2, Math.round((tEnd - tStart) * this._steps));
                for (let s = 0; s <= segs; s++) {
                    const t  = tStart + (tEnd - tStart) * (s / segs);
                    const { position, tangent, normal } = this.path.getFrameAt(t);
                    const cl  = position.clone().addScaledVector(normal, lateralOffset - dashWidth / 2).setY(position.y + 0.018);
                    const cr  = position.clone().addScaledVector(normal, lateralOffset + dashWidth / 2).setY(position.y + 0.018);
                    positions.push(cl.x, cl.y, cl.z, cr.x, cr.y, cr.z);
                    norms.push(0, 1, 0, 0, 1, 0);
                    uvArr.push(0, s / segs, 1, s / segs);
                    if (s > 0) {
                        const a = vtx - 2, b = vtx - 1, c = vtx, d = vtx + 1;
                        idxArr.push(a, b, c, b, d, c);
                    }
                    vtx += 2;
                }
            };

            let tPrev  = 0;
            let inDash = true;
            let segLen = dashLen;
            let cursor = 0;

            for (let i = 1; i <= this._steps; i++) {
                const t   = i / this._steps;
                const arc = t * totalLen;
                while (cursor + segLen < arc) {
                    if (inDash) {
                        const tSeg = Math.min((cursor + segLen) / totalLen, 1);
                        commitDash(tPrev, tSeg);
                        tPrev = tSeg;
                    } else {
                        tPrev = Math.min((cursor + segLen) / totalLen, 1);
                    }
                    cursor += segLen;
                    inDash  = !inDash;
                    segLen  = inDash ? dashLen : dashGap;
                }
            }

            if (positions.length === 0) continue;

            const geo  = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geo.setAttribute('normal',   new THREE.Float32BufferAttribute(norms,     3));
            geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvArr,     2));
            geo.setIndex(idxArr);
            geo.computeVertexNormals();
            const mesh = new THREE.Mesh(geo, material);
            mesh.renderOrder = 2;
            this.trackGroup.add(mesh);
        }
    }

    // ── Neon edge strips ──────────────────────────────────────────────────

    _createNeonEdgeStrips() {
        const leftColor  = this.mapConfig?.theme?.barrierLeftHex || 0xed3cff;
        const rightColor = this.mapConfig?.theme?.barrierRightHex || 0x00f0ff;

        for (const side of [-1, 1]) {
            const colorHex = side === -1 ? rightColor : leftColor;
            const mat = new THREE.MeshStandardMaterial({
                color:             colorHex,
                emissive:          colorHex,
                emissiveIntensity: 5.5,
                roughness:         0.20,
                metalness:         0.35,
                side:              THREE.DoubleSide,
                toneMapped:        false,
            });
            const haloMat = new THREE.MeshBasicMaterial({
                color:       colorHex,
                transparent: true,
                opacity:     0.25,
                side:        THREE.DoubleSide,
                depthWrite:  false,
                toneMapped:  false,
            });

            const edgeOffset = side * (this.halfWidth + 0.05);
            const neonW      = 0.09;

            // Main neon strip
            const geo  = this._buildRibbon(
                this._steps,
                edgeOffset - neonW * side,
                edgeOffset + neonW * side,
                () => 0.25,
            );
            const mesh = new THREE.Mesh(geo, mat);
            mesh.renderOrder = 3;
            this.trackGroup.add(mesh);

            // Soft halo below
            const haloGeo  = this._buildRibbon(
                this._steps,
                edgeOffset - 0.20 * side,
                edgeOffset + 0.20 * side,
                () => 0.05,
            );
            const haloMesh = new THREE.Mesh(haloGeo, haloMat);
            haloMesh.renderOrder = 2;
            this.trackGroup.add(haloMesh);
        }
    }

    // ── Barriers ──────────────────────────────────────────────────────────

    _createBarriers() {
        const bodyHex   = this.mapConfig?.theme?.barrierBodyHex || 0x171624;
        const leftGlow  = this.mapConfig?.theme?.barrierLeftHex || 0xed3cff;
        const rightGlow = this.mapConfig?.theme?.barrierRightHex || 0x00f0ff;

        const bodyMat = new THREE.MeshStandardMaterial({
            color: bodyHex, roughness: 0.25, metalness: 0.92, side: THREE.DoubleSide,
        });
        const supportMat = new THREE.MeshStandardMaterial({
            color: 0x28243a, roughness: 0.28, metalness: 0.86,
        });

        const barrierLateral = this.halfWidth + 0.52;
        const steps          = this._steps;
        const total          = this.path.totalLength;

        const supportSpacing = 6;
        const supportCount   = Math.floor(total / supportSpacing);

        for (const side of [-1, 1]) {
            const glowHex = side === -1 ? rightGlow : leftGlow;
            const neonMat = new THREE.MeshStandardMaterial({
                color: glowHex, emissive: glowHex, emissiveIntensity: 5.0,
                roughness: 0.20, metalness: 0.35, side: THREE.DoubleSide, toneMapped: false,
            });

            const lat = side * barrierLateral;

            // Barrier body ribbon
            const bodyGeo  = this._buildRibbon(steps, lat - 0.27 * side, lat + 0.27 * side, () => 0.575);
            const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
            bodyMesh.receiveShadow = bodyMesh.castShadow = true;
            this.trackGroup.add(bodyMesh);

            // Neon rail (upper)
            const upperGeo  = this._buildRibbon(steps, lat - 0.07 * side, lat + 0.07 * side, () => 0.88);
            this.trackGroup.add(new THREE.Mesh(upperGeo, neonMat));

            // Neon rail (lower)
            const lowerGeo  = this._buildRibbon(steps, lat - 0.07 * side, lat + 0.07 * side, () => 0.22);
            this.trackGroup.add(new THREE.Mesh(lowerGeo, neonMat));

            // Support columns
            const supportGeo  = new THREE.BoxGeometry(0.76, 1.4, 0.16);
            const supportMesh = new THREE.InstancedMesh(supportGeo, supportMat, supportCount);
            const matrix      = new THREE.Matrix4();
            const quat        = new THREE.Quaternion();

            for (let i = 0; i < supportCount; i++) {
                const t       = (i * supportSpacing) / total;
                const { position, tangent, normal } = this.path.getFrameAt(t);
                const colPos  = position.clone().addScaledVector(normal, lat).setY(position.y + 0.63);

                quat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
                matrix.compose(colPos, quat, new THREE.Vector3(1, 1, 1));
                supportMesh.setMatrixAt(i, matrix);
            }
            supportMesh.instanceMatrix.needsUpdate = true;
            supportMesh.castShadow = supportMesh.receiveShadow = true;
            this.trackGroup.add(supportMesh);
        }
    }

    // ── Chevrons ──────────────────────────────────────────────────────────

    _createChevrons() {
        const glowHex = this.mapConfig?.theme?.barrierLeftHex || 0xff3fd8;
        const backingMat = new THREE.MeshStandardMaterial({
            color: 0x0c0d16, roughness: 0.2, metalness: 0.94,
        });
        const glowMat = new THREE.MeshStandardMaterial({
            color: glowHex, emissive: glowHex, emissiveIntensity: 5,
            roughness: 0.2, metalness: 0.2, toneMapped: false,
        });

        const total   = this.path.totalLength;
        const samples = 300;

        for (let i = 0; i < samples; i++) {
            const t = i / samples;
            const t1 = ((i + 1) / samples) % 1;
            const tan0 = this.path.getTangentAt(t);
            const tan1 = this.path.getTangentAt(t1);
            const curvature = tan0.angleTo(tan1);

            const threshold = curvature > 0.018 ? 0.018 : 0.06;
            if ((i % Math.round(1 / threshold)) !== 0) continue;

            const { position, tangent, normal } = this.path.getFrameAt(t);

            for (const side of [-1, 1]) {
                const chevPos = position.clone()
                    .addScaledVector(normal, side * (this.halfWidth + 0.3))
                    .setY(position.y + 0.93);
                this._placeChevron(chevPos, tangent, normal, side, backingMat, glowMat);
            }
        }
    }

    _placeChevron(pos, tangent, normal, side, backingMat, glowMat) {
        const group = new THREE.Group();
        group.add(new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.02, 0.11), backingMat));
        for (const x of [-0.42, 0, 0.42]) {
            const upper = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.115, 0.07), glowMat);
            const lower = upper.clone();
            upper.position.set(x - 0.075,  0.17, -0.07); upper.rotation.z = -0.68;
            lower.position.set(x - 0.075, -0.17, -0.07); lower.rotation.z =  0.68;
            group.add(upper, lower);
        }
        group.position.copy(pos);
        group.rotation.y = Math.atan2(side * normal.x, side * normal.z);
        this.trackGroup.add(group);
    }

    // ── Street lights ─────────────────────────────────────────────────────

    _createStreetLights() {
        const lightHex = this.mapConfig?.theme?.lightHex || 0xf0ccff;
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x29283a, roughness: 0.25, metalness: 0.9 });
        const headMat = new THREE.MeshBasicMaterial({ color: lightHex, toneMapped: false });

        const spacing    = 30;
        const total      = this.path.totalLength;
        const lightCount = Math.floor(total / spacing);

        const poleGeo = new THREE.CylinderGeometry(0.035, 0.07, 4.4, 8);
        const armGeo  = new THREE.BoxGeometry(1.1, 0.055, 0.08);
        const headGeo = new THREE.BoxGeometry(0.65, 0.1, 0.22);

        const poles = new THREE.InstancedMesh(poleGeo, poleMat, lightCount);
        const arms  = new THREE.InstancedMesh(armGeo,  poleMat, lightCount);
        const heads = new THREE.InstancedMesh(headGeo, headMat, lightCount);

        const matrix = new THREE.Matrix4();
        const quat   = new THREE.Quaternion();

        for (let i = 0; i < lightCount; i++) {
            const t      = (i * spacing) / total;
            const { position, tangent, normal } = this.path.getFrameAt(t);
            const side   = i % 2 === 0 ? -1 : 1;
            const sideOff = side * (this.halfWidth + 1.6);

            quat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

            const poleBase = position.clone().addScaledVector(normal, sideOff);
            poleBase.y += 2.2;
            matrix.compose(poleBase, quat, new THREE.Vector3(1, 1, 1));
            poles.setMatrixAt(i, matrix);

            const armPos = position.clone().addScaledVector(normal, sideOff - side * 0.52);
            armPos.y = position.y + 4.27;
            matrix.compose(armPos, quat, new THREE.Vector3(1, 1, 1));
            arms.setMatrixAt(i, matrix);

            const headPos = position.clone().addScaledVector(normal, sideOff - side * 1.0);
            headPos.y = position.y + 4.2;
            matrix.compose(headPos, quat, new THREE.Vector3(1, 1, 1));
            heads.setMatrixAt(i, matrix);
        }

        poles.instanceMatrix.needsUpdate = true;
        arms.instanceMatrix.needsUpdate  = true;
        heads.instanceMatrix.needsUpdate = true;
        poles.castShadow = true;
        this.trackGroup.add(poles, arms, heads);

        const lightSpacing = 80;
        const lightN       = Math.floor(total / lightSpacing);
        for (let i = 0; i < lightN; i++) {
            const t   = (i * lightSpacing) / total;
            const pos = this.path.getPointAt(t);
            const pl  = new THREE.PointLight(lightHex, 11, 27, 2);
            pl.position.set(pos.x, pos.y + 4, pos.z);
            this.trackGroup.add(pl);
        }
    }

    // ── START line (t=0) ──────────────────────────────────────────────────

    _createStartLine() {
        const { position, tangent, normal } = this.path.getFrameAt(0);
        const rotY = Math.atan2(tangent.x, tangent.z);

        const greenMat = new THREE.MeshStandardMaterial({
            color: 0x00ff66, emissive: 0x00ee55, emissiveIntensity: 2,
            roughness: 0.3, toneMapped: false,
        });

        const lineGeo  = new THREE.BoxGeometry(this.roadWidth, 0.022, 0.55);
        const lineMesh = new THREE.Mesh(lineGeo, greenMat);
        lineMesh.position.copy(position).setY(position.y + 0.011);
        lineMesh.rotation.y = rotY;
        this.trackGroup.add(lineMesh);

        const edgeMat = new THREE.MeshStandardMaterial({
            color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.4,
        });
        for (const side of [-1, 1]) {
            const edgeGeo = new THREE.BoxGeometry(0.25, 0.024, 0.55);
            const edge    = new THREE.Mesh(edgeGeo, edgeMat);
            edge.position
                .copy(position)
                .addScaledVector(normal, side * this.halfWidth * 0.97)
                .setY(position.y + 0.012);
            edge.rotation.y = rotY;
            this.trackGroup.add(edge);
        }

        const glow = new THREE.PointLight(0x00ff55, 3, 12, 2);
        glow.position.copy(position).setY(position.y + 1.5);
        this.trackGroup.add(glow);

        const gantryPos = position.clone().addScaledVector(tangent, -10);
        this._createStartGantry(gantryPos, tangent, normal);
    }

    // ── FINISH line (t=0.91) ─────────────────────────────────────────────

    _createFinishLine() {
        const t = 0.91;
        const { position, tangent, normal } = this.path.getFrameAt(t);
        const rotY = Math.atan2(tangent.x, tangent.z);

        const whiteMat = new THREE.MeshStandardMaterial({
            color: 0xffffff, emissive: 0xdddddd, emissiveIntensity: 0.5, roughness: 0.3,
        });
        const darkMat = new THREE.MeshStandardMaterial({
            color: 0x111111, roughness: 0.6,
        });

        // 1. Checkered Finish Line Strip on Track
        const cells = 8;
        const cellW = this.roadWidth / cells;
        const cellD = 0.7;

        for (let c = 0; c < cells; c++) {
            const lateralPos = -this.halfWidth + cellW * (c + 0.5);
            const isWhite    = c % 2 === 0;
            const geo  = new THREE.BoxGeometry(cellW - 0.04, 0.022, cellD);
            const mesh = new THREE.Mesh(geo, isWhite ? whiteMat : darkMat);
            mesh.position
                .copy(position)
                .addScaledVector(normal, lateralPos)
                .setY(position.y + 0.011);
            mesh.rotation.y = rotY;
            this.trackGroup.add(mesh);
        }

        for (let c = 0; c < cells; c++) {
            const lateralPos = -this.halfWidth + cellW * (c + 0.5);
            const isWhite    = c % 2 !== 0;
            const geo  = new THREE.BoxGeometry(cellW - 0.04, 0.022, cellD);
            const mesh = new THREE.Mesh(geo, isWhite ? whiteMat : darkMat);
            mesh.position
                .copy(position)
                .addScaledVector(normal, lateralPos)
                .addScaledVector(tangent, cellD)
                .setY(position.y + 0.011);
            mesh.rotation.y = rotY;
            this.trackGroup.add(mesh);
        }

        // 2. Overhead Finish Gantry
        const pillarMat = new THREE.MeshStandardMaterial({
            color: 0x1a1630, roughness: 0.3, metalness: 0.9,
        });
        const whiteFlagMat = new THREE.MeshStandardMaterial({
            color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.5,
            roughness: 0.2, toneMapped: false,
        });

        const arcQuat = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, 1), tangent
        );
        const pH  = 5;
        const pOff = this.halfWidth + 0.8;
        const pGeo = new THREE.CylinderGeometry(0.15, 0.18, pH, 8);

        const lP = new THREE.Mesh(pGeo, pillarMat);
        lP.position.copy(position).addScaledVector(normal, -pOff).setY(position.y + pH / 2);
        this.trackGroup.add(lP);

        const rP = new THREE.Mesh(pGeo, pillarMat);
        rP.position.copy(position).addScaledVector(normal, pOff).setY(position.y + pH / 2);
        this.trackGroup.add(rP);

        const crossGeo = new THREE.BoxGeometry(this.roadWidth + 1.2, 0.24, 0.24);
        const cross = new THREE.Mesh(crossGeo, pillarMat);
        cross.position.copy(position).setY(position.y + pH);
        cross.quaternion.copy(arcQuat);
        this.trackGroup.add(cross);

        const archGeo = new THREE.BoxGeometry(this.roadWidth + 1.3, 0.13, 0.13);
        const arch = new THREE.Mesh(archGeo, whiteFlagMat);
        arch.position.copy(position).setY(position.y + pH + 0.14);
        arch.quaternion.copy(arcQuat);
        this.trackGroup.add(arch);

        const fl = new THREE.PointLight(0xffffff, 5, 14, 2);
        fl.position.copy(position).setY(position.y + pH + 0.3);
        this.trackGroup.add(fl);

        // 3. DEAD END Physical & Visual Wall Barrier (t = 0.916)
        this._createDeadEndBarrier();
    }

    _createDeadEndBarrier() {
        const deadEndT = 0.916;
        const { position, tangent, normal } = this.path.getFrameAt(deadEndT);
        const rotY = Math.atan2(tangent.x, tangent.z);
        const wallQuat = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, 1), tangent
        );

        const wallWidth = this.roadWidth + 3.8;
        const wallHeight = 4.2;
        const wallDepth = 1.4;

        // Texture for the front face with hazard chevrons and DEAD END sign
        const hazardTex = this._createDeadEndTexture();

        const wallBaseMat = new THREE.MeshStandardMaterial({
            color: 0x181a24,
            roughness: 0.4,
            metalness: 0.8,
        });

        const wallFrontMat = new THREE.MeshStandardMaterial({
            map: hazardTex,
            roughness: 0.25,
            metalness: 0.6,
            emissive: 0x331111,
            emissiveIntensity: 0.4,
        });

        // 6-material array for BoxGeometry (right, left, top, bottom, front (+Z), back (-Z))
        const wallMaterials = [
            wallBaseMat,
            wallBaseMat,
            wallBaseMat,
            wallBaseMat,
            wallBaseMat,
            wallFrontMat, // Back face facing incoming traffic (-Z in local orientation)
        ];

        const wallGeo = new THREE.BoxGeometry(wallWidth, wallHeight, wallDepth);
        const wallMesh = new THREE.Mesh(wallGeo, wallMaterials);
        wallMesh.position.copy(position).setY(position.y + wallHeight / 2);
        wallMesh.quaternion.copy(wallQuat);
        this.trackGroup.add(wallMesh);

        // Neon warning rim on the barrier
        const rimMat = new THREE.MeshStandardMaterial({
            color: 0xff0055,
            emissive: 0xff0044,
            emissiveIntensity: 3.0,
            roughness: 0.2,
            toneMapped: false,
        });
        const topRim = new THREE.Mesh(new THREE.BoxGeometry(wallWidth + 0.2, 0.16, wallDepth + 0.1), rimMat);
        topRim.position.copy(position).setY(position.y + wallHeight + 0.08);
        topRim.quaternion.copy(wallQuat);
        this.trackGroup.add(topRim);

        // Heavy steel bumper rail at bottom of wall
        const bumperMat = new THREE.MeshStandardMaterial({
            color: 0x3a3d4d,
            roughness: 0.3,
            metalness: 0.95,
        });
        const bumperGeo = new THREE.BoxGeometry(wallWidth + 0.4, 0.6, 0.4);
        const bumperMesh = new THREE.Mesh(bumperGeo, bumperMat);
        bumperMesh.position.copy(position).addScaledVector(tangent, -wallDepth / 2 - 0.2).setY(position.y + 0.3);
        bumperMesh.quaternion.copy(wallQuat);
        this.trackGroup.add(bumperMesh);

        // Impact attenuation crash barrels (6 barrels lined up in front of wall)
        const barrelMat = new THREE.MeshStandardMaterial({
            color: 0xffaa00,
            emissive: 0xaa5500,
            emissiveIntensity: 0.6,
            roughness: 0.35,
            metalness: 0.4,
        });
        const barrelRingMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.5,
            metalness: 0.8,
        });

        const barrelCount = 6;
        const barrelSpacing = (this.roadWidth - 1.5) / (barrelCount - 1);

        for (let b = 0; b < barrelCount; b++) {
            const lat = -this.halfWidth + 0.75 + b * barrelSpacing;
            const barrelGroup = new THREE.Group();

            const barrelGeo = new THREE.CylinderGeometry(0.48, 0.48, 1.1, 16);
            const bMesh = new THREE.Mesh(barrelGeo, barrelMat);
            bMesh.position.y = 0.55;
            barrelGroup.add(bMesh);

            const ringGeo = new THREE.CylinderGeometry(0.50, 0.50, 0.18, 16);
            const rMesh = new THREE.Mesh(ringGeo, barrelRingMat);
            rMesh.position.y = 0.55;
            barrelGroup.add(rMesh);

            barrelGroup.position.copy(position)
                .addScaledVector(normal, lat)
                .addScaledVector(tangent, -wallDepth / 2 - 0.8)
                .setY(position.y);
            barrelGroup.rotation.y = rotY;
            this.trackGroup.add(barrelGroup);
        }

        // Flashing Warning Beacons on Top Corners
        const beaconMat = new THREE.MeshStandardMaterial({
            color: 0xff2200,
            emissive: 0xff0000,
            emissiveIntensity: 4.0,
            roughness: 0.1,
            toneMapped: false,
        });
        const beaconGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.5, 12);

        for (const side of [-1, 1]) {
            const beacon = new THREE.Mesh(beaconGeo, beaconMat);
            beacon.position.copy(position)
                .addScaledVector(normal, side * (wallWidth / 2 - 0.4))
                .setY(position.y + wallHeight + 0.35);
            beacon.quaternion.copy(wallQuat);
            this.trackGroup.add(beacon);

            const beaconLight = new THREE.PointLight(0xff1100, 6, 16, 2);
            beaconLight.position.copy(beacon.position).setY(beacon.position.y + 0.3);
            this.trackGroup.add(beaconLight);
        }

        // Heavy concrete side wing barriers connecting wall to ground shoulders
        for (const side of [-1, 1]) {
            const wingGeo = new THREE.BoxGeometry(0.8, wallHeight * 0.85, 3.2);
            const wing = new THREE.Mesh(wingGeo, wallBaseMat);
            wing.position.copy(position)
                .addScaledVector(normal, side * (wallWidth / 2 - 0.1))
                .addScaledVector(tangent, -1.2)
                .setY(position.y + (wallHeight * 0.85) / 2);
            wing.quaternion.copy(wallQuat);
            this.trackGroup.add(wing);
        }
    }

    _createDeadEndTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Dark background
        ctx.fillStyle = '#0a0d14';
        ctx.fillRect(0, 0, 1024, 256);

        // Diagonal hazard stripes
        ctx.save();
        ctx.fillStyle = '#ffb300';
        for (let x = -256; x < 1024 + 256; x += 64) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + 32, 0);
            ctx.lineTo(x - 32, 256);
            ctx.lineTo(x - 64, 256);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        // Dark central badge
        ctx.fillStyle = 'rgba(10, 12, 18, 0.94)';
        ctx.fillRect(80, 40, 1024 - 160, 176);
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 6;
        ctx.strokeRect(80, 40, 1024 - 160, 176);

        // Inner glowing border
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 3;
        ctx.strokeRect(92, 52, 1024 - 184, 152);

        // Bold warning text
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 44px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('///  DEAD END  —  FINISH LINE  ///', 512, 105);

        ctx.fillStyle = '#ff0055';
        ctx.font = '800 24px monospace';
        ctx.fillText('TRACK TERMINATION • FINISH BARRIER', 512, 160);

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 8;
        return texture;
    }


    _createStartGantry(position, tangent, normal) {
        const pillarMat = new THREE.MeshStandardMaterial({
            color: 0x1a1630, roughness: 0.3, metalness: 0.9,
        });
        const archMat = new THREE.MeshStandardMaterial({
            color: 0xff4fd8, emissive: 0xff00cc, emissiveIntensity: 3,
            roughness: 0.2, toneMapped: false,
        });

        const arcQuat = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, 1), tangent
        );

        const pillarH   = 5;
        const gantryW   = this.roadWidth + 1.2;
        const pillarOff = this.halfWidth + 0.8;

        const pillarGeo = new THREE.CylinderGeometry(0.18, 0.22, pillarH, 8);
        const crossGeo  = new THREE.BoxGeometry(gantryW, 0.28, 0.28);
        const archGeo   = new THREE.BoxGeometry(gantryW + 0.15, 0.14, 0.14);

        const lPillar = new THREE.Mesh(pillarGeo, pillarMat);
        lPillar.position.copy(position).addScaledVector(normal, -pillarOff);
        lPillar.position.y += pillarH / 2;
        this.trackGroup.add(lPillar);

        const rPillar = new THREE.Mesh(pillarGeo, pillarMat);
        rPillar.position.copy(position).addScaledVector(normal, pillarOff);
        rPillar.position.y += pillarH / 2;
        this.trackGroup.add(rPillar);

        const cross = new THREE.Mesh(crossGeo, pillarMat);
        cross.position.copy(position).setY(position.y + pillarH);
        cross.quaternion.copy(arcQuat);
        this.trackGroup.add(cross);

        const archBar = new THREE.Mesh(archGeo, archMat);
        archBar.position.copy(position).setY(position.y + pillarH + 0.16);
        archBar.quaternion.copy(arcQuat);
        this.trackGroup.add(archBar);

        for (const side of [-1, 1]) {
            const gl = new THREE.PointLight(0xff44ee, 4, 12, 2);
            gl.position
                .copy(position)
                .addScaledVector(normal, side * (gantryW * 0.25))
                .setY(position.y + pillarH + 0.3);
            this.trackGroup.add(gl);
        }
    }

    // ── Barrier spill lights ──────────────────────────────────────────────

    _createBarrierSpillLights() {
        const spillHex = this.mapConfig?.theme?.barrierLeftHex || 0xa92dff;
        const spacing = 80;
        const total   = this.path.totalLength;
        const count   = Math.floor(total / spacing);

        for (let i = 0; i < count; i++) {
            const t   = (i * spacing) / total;
            const { position, normal } = this.path.getFrameAt(t);

            for (const side of [-1, 1]) {
                const pl = new THREE.PointLight(spillHex, 3.7, 11, 2);
                pl.position.copy(position)
                  .addScaledVector(normal, side * (this.halfWidth + 0.55))
                  .setY(position.y + 0.38);
                this.trackGroup.add(pl);
            }
        }
    }
}
