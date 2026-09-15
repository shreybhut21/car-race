import * as THREE from 'three';
import { TrackPath } from './TrackPath.js';
import { FINISH_T, FINISH_DEAD_END_T } from '../utils/Constants.js';

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
        this._steps     = 800;                       // 800 steps for smooth curvature on 4.5km circuit

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
        // this._createLaneMarkings(); // Disabled per user request (clean road)
        this._createNeonEdgeStrips();
        this._createBarriers();
        this._createChevrons();
        this._createStreetLights();
        this._createStartLine();
        this._createFinishLine();
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
        const material = new THREE.MeshStandardMaterial({
            color:              0x141722,
            roughness:          0.92,
            metalness:          0.05,
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
            color: 0x171725, roughness: 0.90, metalness: 0.05,
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
        // Disabled per user request (clean road without lane lines)
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

    // ── FINISH line (t=FINISH_T) ─────────────────────────────────────────

    // ── FINISH line (t=FINISH_T) & Barricade ─────────────────────────

    _createFinishLine() {
        const t = FINISH_T;
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

        // 2. Overhead Grand Finish Banner & Gantry
        const bannerW = this.roadWidth + 1.6;
        const bannerH = 2.6;
        const pH = 5.8;
        const pOff = this.halfWidth + 1.0;

        const arcQuat = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, 1), tangent
        );

        const pillarMat = new THREE.MeshStandardMaterial({
            color: 0x141624, roughness: 0.3, metalness: 0.9,
        });
        const goldGlowMat = new THREE.MeshStandardMaterial({
            color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 2.5,
            roughness: 0.2, toneMapped: false,
        });

        // Support Pillars
        const pGeo = new THREE.CylinderGeometry(0.22, 0.28, pH, 8);
        const lP = new THREE.Mesh(pGeo, pillarMat);
        lP.position.copy(position).addScaledVector(normal, -pOff).setY(position.y + pH / 2);
        this.trackGroup.add(lP);

        const rP = new THREE.Mesh(pGeo, pillarMat);
        rP.position.copy(position).addScaledVector(normal, pOff).setY(position.y + pH / 2);
        this.trackGroup.add(rP);

        // Cross truss
        const crossGeo = new THREE.BoxGeometry(bannerW, 0.3, 0.3);
        const cross = new THREE.Mesh(crossGeo, pillarMat);
        cross.position.copy(position).setY(position.y + pH + 0.6);
        cross.quaternion.copy(arcQuat);
        this.trackGroup.add(cross);

        // Glowing Finish Banner Board
        const bannerTex = this._createFinishBannerTexture();
        const bannerMat = new THREE.MeshStandardMaterial({
            map: bannerTex,
            transparent: true,
            roughness: 0.2,
            metalness: 0.3,
            emissive: 0xffcc00,
            emissiveIntensity: 1.8,
            side: THREE.DoubleSide
        });

        const bannerGeo = new THREE.PlaneGeometry(bannerW, bannerH);
        const bannerMesh = new THREE.Mesh(bannerGeo, bannerMat);
        bannerMesh.position.copy(position).setY(position.y + pH - 0.7);
        bannerMesh.quaternion.copy(arcQuat);
        this.trackGroup.add(bannerMesh);

        // Top Neon Crown Strip
        const archGeo = new THREE.BoxGeometry(bannerW + 0.2, 0.16, 0.16);
        const arch = new THREE.Mesh(archGeo, goldGlowMat);
        arch.position.copy(position).setY(position.y + pH + 0.75);
        arch.quaternion.copy(arcQuat);
        this.trackGroup.add(arch);

        // 3. Physical Finish Hazard Barricade (18m past the finish line)
        this._createFinishBarricade();
    }

    _createFinishBannerTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Dark carbon background
        ctx.fillStyle = '#080a12';
        ctx.fillRect(0, 0, 1024, 256);

        // Checkered border on left & right
        const squareSize = 24;
        for (let y = 0; y < 256; y += squareSize) {
            for (let x = 0; x < 144; x += squareSize) {
                const isWhite = ((x / squareSize) + (y / squareSize)) % 2 === 0;
                ctx.fillStyle = isWhite ? '#ffffff' : '#000000';
                ctx.fillRect(x, y, squareSize, squareSize);
                ctx.fillRect(1024 - 144 + x, y, squareSize, squareSize);
            }
        }

        // Gold border frames
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 6;
        ctx.strokeRect(144, 8, 1024 - 288, 240);

        // Top tag
        ctx.fillStyle = '#ffaa00';
        ctx.font = '900 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('★ 5.5 KM GRAND PRIX ★', 512, 45);

        // Main FINISH text
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 86px sans-serif';
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 24;
        ctx.fillText('🏁 FINISH 🏁', 512, 140);
        ctx.shadowBlur = 0;

        // Subtitle
        ctx.fillStyle = '#ff8800';
        ctx.font = '800 24px monospace';
        ctx.fillText('/// FINAL LAP COMPLETE ///', 512, 210);

        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 8;
        return tex;
    }

    _createFinishBarricade() {
        const { position, tangent, normal } = this.path.getFrameAt(FINISH_DEAD_END_T);
        const rotY = Math.atan2(tangent.x, tangent.z);
        const arcQuat = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, 1), tangent
        );

        const barW = this.roadWidth + 2.0;
        const barH = 1.8;

        const barrierGroup = new THREE.Group();
        barrierGroup.position.copy(position).setY(position.y + barH / 2);
        barrierGroup.quaternion.copy(arcQuat);

        // Concrete Crash Barrier Base
        const baseGeo = new THREE.BoxGeometry(barW, 0.7, 1.2);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x222533, roughness: 0.6, metalness: 0.4
        });
        const baseMesh = new THREE.Mesh(baseGeo, baseMat);
        baseMesh.position.y = -0.55;
        barrierGroup.add(baseMesh);

        // Hazard Striped Crash Wall Panel
        const hazardTex = this._createHazardTexture();
        const wallMat = new THREE.MeshStandardMaterial({
            map: hazardTex,
            roughness: 0.3,
            metalness: 0.5,
            emissive: 0xff3300,
            emissiveIntensity: 0.8
        });
        const wallGeo = new THREE.BoxGeometry(barW - 0.2, barH, 0.4);
        const wallMesh = new THREE.Mesh(wallGeo, wallMat);
        wallMesh.position.y = 0.1;
        barrierGroup.add(wallMesh);

        // Flashing Strobe Hazard Warning Lights on top
        const strobeMat = new THREE.MeshStandardMaterial({
            color: 0xff2200,
            emissive: 0xff1100,
            emissiveIntensity: 4.5,
            toneMapped: false
        });
        const strobeGeo = new THREE.CylinderGeometry(0.16, 0.2, 0.35, 8);

        for (let i = -4; i <= 4; i++) {
            const strobe = new THREE.Mesh(strobeGeo, strobeMat);
            strobe.position.set(i * (barW / 9), barH / 2 + 0.2, 0);
            barrierGroup.add(strobe);
        }

        this.trackGroup.add(barrierGroup);
    }

    _createHazardTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Black base
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, 1024, 256);

        // Yellow / Orange hazard stripes
        ctx.fillStyle = '#ffaa00';
        const stripeW = 64;
        for (let x = -256; x < 1280; x += stripeW * 2) {
            ctx.beginPath();
            ctx.moveTo(x, 256);
            ctx.lineTo(x + stripeW, 256);
            ctx.lineTo(x + stripeW + 120, 0);
            ctx.lineTo(x + 120, 0);
            ctx.closePath();
            ctx.fill();
        }

        // Center Warning Box
        ctx.fillStyle = 'rgba(10, 10, 16, 0.9)';
        ctx.fillRect(200, 50, 624, 156);
        ctx.strokeStyle = '#ff3300';
        ctx.lineWidth = 6;
        ctx.strokeRect(200, 50, 624, 156);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 42px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚠ ROAD CLOSED ⚠', 512, 115);

        ctx.fillStyle = '#ffaa00';
        ctx.font = '800 26px monospace';
        ctx.fillText('RACE CIRCUIT TERMINUS', 512, 165);

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        return tex;
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

}
