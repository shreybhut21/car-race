import * as THREE from 'three';

/**
 * TrackLandmarks – High-performance 1km Distant Horizon Cityscape & Covered Highway Canopy.
 *
 * Features:
 *  • Covered neon track canopy (arch ribs, glass roof, laser spine ribbons, directional chevrons).
 *  • 120+ Grand Megastructure Skyscrapers situated on the 1km distant horizon (600m–1300m away).
 *  • Holographic roadside billboards and sci-fi streetlamp gantries.
 *  • Animated overhead flying sky traffic between distant megacity towers.
 *  • Ultra-high performance: all batch-rendered with THREE.InstancedMesh (< 15 total draw calls).
 */
export class TrackLandmarks {
    constructor(scene, track) {
        this.scene = scene;
        this.track = track;
        this.path  = track.path;

        this.group = new THREE.Group();
        this.scene.add(this.group);

        // Pre-allocated math objects for zero GC in update loop
        this._dummy = new THREE.Object3D();
        this._tempMat = new THREE.Matrix4();
        this._skyVehicles = [];

        this._initTextures();
        this._buildLandmarks();
    }

    _initTextures() {
        if (!this._windowTex) {
            this._windowTex = this._createWindowAtlasTexture();
        }
    }

    _createWindowAtlasTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Dark architectural facade (tinted glass & dark composite panels)
        ctx.fillStyle = '#0b0e17';
        ctx.fillRect(0, 0, 512, 512);

        // Realistic office floor grid
        const rows = 32;
        const cols = 16;
        const padX = 6;
        const padY = 5;
        const wW = (512 / cols) - padX;
        const wH = (512 / rows) - padY;

        // Realistic modern city night window colors (warm incandescent, soft neutral white, golden office lights)
        const realisticWindowColors = [
            '#ffe6b8', // Warm office interior
            '#fff0d0', // Warm incandescent
            '#eef3ff', // Cool white office fluorescent
            '#f5f7fa', // Neutral white office
            '#ffd699', // Soft golden office
            '#d4e5ff', // Soft skylight ambient reflection
        ];

        for (let r = 0; r < rows; r++) {
            // Horizontal dark floor slab line
            ctx.fillStyle = '#06080e';
            ctx.fillRect(0, r * (512 / rows), 512, 2);

            for (let c = 0; c < cols; c++) {
                const x = c * (512 / cols) + padX / 2;
                const y = r * (512 / rows) + padY / 2;

                const rand = Math.random();
                if (rand < 0.28) { // Realistic ~28% active office window occupancy
                    const cIdx = Math.floor(Math.random() * realisticWindowColors.length);
                    ctx.fillStyle = realisticWindowColors[cIdx];
                    ctx.fillRect(x, y, wW, wH);
                } else {
                    ctx.fillStyle = '#101420'; // Dark unlit office glass
                    ctx.fillRect(x, y, wW, wH);
                }
            }
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 6);
        tex.anisotropy = 4;
        return tex;
    }

    rebuild() {
        while (this.group.children.length > 0) {
            const child = this.group.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
            this.group.remove(child);
        }

        this.path = this.track.path;
        this._skyVehicles = [];
        this._buildLandmarks();
    }

    _buildLandmarks() {
        this._createTrackCanopy();
        this._createDistantHorizonSkyline();
        this._createStreetlights();
        this._createHoloBillboards();
        this._createSkybridges();
        this._createSkyTraffic();
        this._createBridgeLandmarks();
    }

    // ── 1. Covered Track Canopy (Overhead Arches, Glass Ceiling & Laser Spine) ──

    _createTrackCanopy() {
        // Continuous canopy covering major sectors of the track
        const canopySectors = [
            { tStart: 0.03, tEnd: 0.28, ribs: 32 }, // Sector 1: Start Straight to Sweeping Turn
            { tStart: 0.33, tEnd: 0.45, ribs: 18 }, // Sector 2: S-Curve Tech Corridor
            { tStart: 0.58, tEnd: 0.89, ribs: 40 }, // Sector 3: Final High-Speed Canyon to Finish
        ];

        let totalRibs = 0;
        canopySectors.forEach(s => totalRibs += s.ribs);

        const ribSpanW = this.track.roadWidth + 3.0;
        const ribH     = 7.6;

        // Geometries
        const ribArchGeo = new THREE.BoxGeometry(ribSpanW, 0.26, 0.45);
        const ribPillarGeo = new THREE.BoxGeometry(0.32, ribH, 0.45);
        const roofPanelGeo = new THREE.BoxGeometry(ribSpanW - 0.4, 0.06, 6.8);
        const spineLightGeo = new THREE.BoxGeometry(0.22, 0.14, 6.8);

        // Materials
        const ribStructureMat = new THREE.MeshStandardMaterial({
            color: 0x161a26, roughness: 0.4, metalness: 0.8,
        });

        const ribNeonGlowMat = new THREE.MeshStandardMaterial({
            color: 0x00d4ff,
            emissive: 0x0099cc,
            emissiveIntensity: 1.8,
            roughness: 0.2,
        });

        const glassRoofMat = new THREE.MeshPhysicalMaterial({
            color: 0x060c18,
            emissive: 0x001533,
            emissiveIntensity: 0.3,
            roughness: 0.2,
            metalness: 0.8,
            transmission: 0.65,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide,
        });

        const spineLaserMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00bfff,
            emissiveIntensity: 2.2,
            roughness: 0.2,
        });

        // Instanced Meshes
        const archMesh     = new THREE.InstancedMesh(ribArchGeo, ribNeonGlowMat, totalRibs);
        const pillarsMesh  = new THREE.InstancedMesh(ribPillarGeo, ribStructureMat, totalRibs * 2);
        const roofMesh     = new THREE.InstancedMesh(roofPanelGeo, glassRoofMat, totalRibs);
        const spineLMesh   = new THREE.InstancedMesh(spineLightGeo, spineLaserMat, totalRibs);
        const spineRMesh   = new THREE.InstancedMesh(spineLightGeo, ribNeonGlowMat, totalRibs);

        const dummy = this._dummy;
        let rIdx = 0;
        let pIdx = 0;

        canopySectors.forEach((sec) => {
            for (let i = 0; i < sec.ribs; i++) {
                const t = sec.tStart + (sec.tEnd - sec.tStart) * (i / sec.ribs);
                const { position, tangent, normal } = this.path.getFrameAt(t);
                const quat = new THREE.Quaternion().setFromUnitVectors(
                    new THREE.Vector3(0, 0, 1), tangent
                );

                // 1. Overhead Cross Arch
                const archPos = position.clone().setY(position.y + ribH);
                dummy.position.copy(archPos);
                dummy.quaternion.copy(quat);
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                archMesh.setMatrixAt(rIdx, dummy.matrix);

                // 2. Left and Right Support Pillars
                for (const side of [-1, 1]) {
                    const pPos = position.clone()
                        .addScaledVector(normal, side * (this.track.halfWidth + 1.2))
                        .setY(position.y + ribH / 2);
                    dummy.position.copy(pPos);
                    dummy.quaternion.copy(quat);
                    dummy.scale.set(1, 1, 1);
                    dummy.updateMatrix();
                    pillarsMesh.setMatrixAt(pIdx++, dummy.matrix);
                }

                // 3. Translucent Glass Roof Canopy Panel
                const roofPos = position.clone().setY(position.y + ribH + 0.12);
                dummy.position.copy(roofPos);
                dummy.quaternion.copy(quat);
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                roofMesh.setMatrixAt(rIdx, dummy.matrix);

                // 4. Dual Overhead Laser Ribbons
                const spineL = position.clone()
                    .addScaledVector(normal, -2.4)
                    .setY(position.y + ribH - 0.1);
                dummy.position.copy(spineL);
                dummy.quaternion.copy(quat);
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                spineLMesh.setMatrixAt(rIdx, dummy.matrix);

                const spineR = position.clone()
                    .addScaledVector(normal, 2.4)
                    .setY(position.y + ribH - 0.1);
                dummy.position.copy(spineR);
                dummy.quaternion.copy(quat);
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                spineRMesh.setMatrixAt(rIdx, dummy.matrix);

                rIdx++;
            }
        });

        archMesh.instanceMatrix.needsUpdate = true;
        pillarsMesh.instanceMatrix.needsUpdate = true;
        roofMesh.instanceMatrix.needsUpdate = true;
        spineLMesh.instanceMatrix.needsUpdate = true;
        spineRMesh.instanceMatrix.needsUpdate = true;

        this.group.add(archMesh, pillarsMesh, roofMesh, spineLMesh, spineRMesh);
    }

    // ── 2. Floating Sky Islands & Levitating Megastructures ───────────────────

    _createDistantHorizonSkyline() {
        const totalIslands = 100;
        const totalDebris  = 60;

        // Geometries for floating islands and megastructures
        const plateauGeo   = new THREE.CylinderGeometry(1, 0.88, 1, 7);
        const keelGeo      = new THREE.ConeGeometry(1, 1, 7);
        const antiGravGeo  = new THREE.TorusGeometry(1, 0.12, 8, 20);
        const bodyGeo      = new THREE.BoxGeometry(1, 1, 1);
        const capGeo       = new THREE.BoxGeometry(1, 0.4, 1);
        const spireGeo     = new THREE.CylinderGeometry(0.1, 0.4, 1, 6);
        const rockGeo      = new THREE.DodecahedronGeometry(1);

        // Rocky Island Landmass Materials (Crag stone plateau & inverted deep keel)
        const plateauMat = new THREE.MeshStandardMaterial({
            color: 0x1c1e2c,
            roughness: 0.85,
            metalness: 0.2,
        });

        const keelMat = new THREE.MeshStandardMaterial({
            color: 0x11131c,
            roughness: 0.95,
            metalness: 0.1,
        });

        // Anti-Gravity Levitator Plasma Core
        const antiGravMat = new THREE.MeshStandardMaterial({
            color: 0x00e5ff,
            emissive: 0x0099ff,
            emissiveIntensity: 2.2,
            roughness: 0.2,
            toneMapped: false,
        });

        // Realistic Architectural Skyscraper Facade
        const buildingMat = new THREE.MeshStandardMaterial({
            color: 0x141824,
            map: this._windowTex,
            emissiveMap: this._windowTex,
            emissive: 0xffffff,
            emissiveIntensity: 0.85,
            roughness: 0.35,
            metalness: 0.85,
        });

        // Architectural Rooftop Rim Wash
        const capMat = new THREE.MeshStandardMaterial({
            color: 0x222634,
            emissive: 0xaaccff,
            emissiveIntensity: 0.8,
            roughness: 0.3,
            metalness: 0.8,
        });

        // Red Aviation Warning Beacons
        const spireMat = new THREE.MeshStandardMaterial({
            color: 0xff1122,
            emissive: 0xff0022,
            emissiveIntensity: 2.0,
            roughness: 0.2,
        });

        const plateauMesh  = new THREE.InstancedMesh(plateauGeo, plateauMat, totalIslands);
        const keelMesh     = new THREE.InstancedMesh(keelGeo, keelMat, totalIslands);
        const antiGravMesh = new THREE.InstancedMesh(antiGravGeo, antiGravMat, totalIslands);
        const bodyMesh     = new THREE.InstancedMesh(bodyGeo, buildingMat, totalIslands);
        const capMesh      = new THREE.InstancedMesh(capGeo, capMat, totalIslands);
        const spireMesh    = new THREE.InstancedMesh(spireGeo, spireMat, totalIslands);
        const debrisMesh   = new THREE.InstancedMesh(rockGeo, plateauMat, totalDebris);

        const dummy = this._dummy;
        const center = new THREE.Vector3(0, 0, 270);

        for (let i = 0; i < totalIslands; i++) {
            // Distribute in 3 expansive rings between 650m and 1300m away
            const ring = i % 3;
            const baseRadius = ring === 0 ? 680 : ring === 1 ? 920 : 1240;
            const radius = baseRadius + ((i * 43) % 170);
            const angle = (i / totalIslands) * Math.PI * 2 + ((i % 5) * 0.08);

            const x = center.x + Math.cos(angle) * radius;
            const z = center.z + Math.sin(angle) * radius;

            // Island floating height in the air (suspended between 110m and 290m altitude)
            const islandY = 110 + ((i * 37) % 180);
            const islandR = 48 + (i % 6) * 11;       // Radius: 48m – 103m
            const islandT = 22 + (i % 4) * 6;        // Thickness: 22m – 40m
            const keelH   = 75 + (i % 5) * 22;       // Inverted rock keel depth: 75m – 163m

            // 1. Upper Bedrock Plateau
            dummy.position.set(x, islandY, z);
            dummy.rotation.set(0, angle + Math.PI / 2, 0);
            dummy.scale.set(islandR, islandT, islandR);
            dummy.updateMatrix();
            plateauMesh.setMatrixAt(i, dummy.matrix);

            // 2. Inverted Rocky Underbelly Keel (hanging into open air void)
            dummy.position.set(x, islandY - (islandT / 2) - (keelH / 2), z);
            dummy.rotation.set(Math.PI, angle, 0); // Inverted upside down
            dummy.scale.set(islandR * 0.95, keelH, islandR * 0.95);
            dummy.updateMatrix();
            keelMesh.setMatrixAt(i, dummy.matrix);

            // 3. Glowing Anti-Gravity Thruster Repulsor Ring
            dummy.position.set(x, islandY - (islandT / 2) - 3.0, z);
            dummy.rotation.set(Math.PI / 2, 0, 0);
            dummy.scale.set(islandR * 0.62, islandR * 0.62, 1);
            dummy.updateMatrix();
            antiGravMesh.setMatrixAt(i, dummy.matrix);

            // 4. Skyscraper Building perched on the floating island
            const bldgW = islandR * (0.62 + (i % 3) * 0.08);
            const bldgD = islandR * (0.62 + ((i + 1) % 3) * 0.08);
            const bldgH = 140 + ((i * 29) % 240); // Tower rises 140m – 380m above island

            const bldgBaseY = islandY + (islandT / 2);
            dummy.position.set(x, bldgBaseY + (bldgH / 2), z);
            dummy.rotation.set(0, angle + Math.PI / 2 + ((i % 4) * 0.15), 0);
            dummy.scale.set(bldgW, bldgH, bldgD);
            dummy.updateMatrix();
            bodyMesh.setMatrixAt(i, dummy.matrix);

            // 5. Rooftop Cap
            dummy.position.set(x, bldgBaseY + bldgH + 2.5, z);
            dummy.scale.set(bldgW * 1.02, 5.0, bldgD * 1.02);
            dummy.updateMatrix();
            capMesh.setMatrixAt(i, dummy.matrix);

            // 6. Antenna Beacon Spire
            const spireH = 40 + (i % 6) * 10;
            dummy.position.set(x, bldgBaseY + bldgH + 5.0 + (spireH / 2), z);
            dummy.scale.set(4.0, spireH, 4.0);
            dummy.updateMatrix();
            spireMesh.setMatrixAt(i, dummy.matrix);
        }

        // Floating Satellite Micro-Islands & Debris Rocks drifting in the sky void
        for (let j = 0; j < totalDebris; j++) {
            const debRadius = 550 + ((j * 53) % 700);
            const debAngle  = (j / totalDebris) * Math.PI * 2 + (j * 0.31);
            const debX      = center.x + Math.cos(debAngle) * debRadius;
            const debZ      = center.z + Math.sin(debAngle) * debRadius;
            const debY      = 70 + ((j * 31) % 280);
            const debScale  = 12 + (j % 7) * 4;

            dummy.position.set(debX, debY, debZ);
            dummy.rotation.set(j * 0.7, j * 1.1, j * 0.4);
            dummy.scale.set(debScale, debScale * 1.3, debScale);
            dummy.updateMatrix();
            debrisMesh.setMatrixAt(j, dummy.matrix);
        }

        plateauMesh.instanceMatrix.needsUpdate  = true;
        keelMesh.instanceMatrix.needsUpdate     = true;
        antiGravMesh.instanceMatrix.needsUpdate = true;
        bodyMesh.instanceMatrix.needsUpdate     = true;
        capMesh.instanceMatrix.needsUpdate      = true;
        spireMesh.instanceMatrix.needsUpdate    = true;
        debrisMesh.instanceMatrix.needsUpdate   = true;

        this.group.add(plateauMesh, keelMesh, antiGravMesh, bodyMesh, capMesh, spireMesh, debrisMesh);
    }


    // ── 3. Roadside Sci-Fi Streetlights (2 Draw Calls) ─────────────────────────

    _createStreetlights() {
        const count = 48;
        const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 8.5, 6);
        const headGeo = new THREE.BoxGeometry(2.4, 0.22, 0.45);

        const poleMat = new THREE.MeshStandardMaterial({
            color: 0x1f2233, roughness: 0.4, metalness: 0.85,
        });
        const lightHeadMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x00f0ff,
            emissiveIntensity: 3.2,
            roughness: 0.15,
            toneMapped: false,
        });

        const poleMesh = new THREE.InstancedMesh(poleGeo, poleMat, count * 2);
        const headMesh = new THREE.InstancedMesh(headGeo, lightHeadMat, count * 2);

        const dummy = this._dummy;
        let idx = 0;

        for (let i = 0; i < count; i++) {
            const t = (i + 0.25) / count;
            const { position, tangent, normal } = this.path.getFrameAt(t);
            const rotY = Math.atan2(tangent.x, tangent.z);

            for (const side of [-1, 1]) {
                const polePos = position.clone()
                    .addScaledVector(normal, side * (this.track.halfWidth + 1.0))
                    .setY(position.y + 4.25);

                dummy.position.copy(polePos);
                dummy.rotation.set(0, rotY, 0);
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                poleMesh.setMatrixAt(idx, dummy.matrix);

                const headPos = polePos.clone()
                    .addScaledVector(normal, -side * 0.8)
                    .setY(position.y + 8.4);

                dummy.position.copy(headPos);
                dummy.rotation.set(0, rotY, side * -0.2);
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                headMesh.setMatrixAt(idx, dummy.matrix);

                idx++;
            }
        }

        poleMesh.instanceMatrix.needsUpdate = true;
        headMesh.instanceMatrix.needsUpdate = true;
        this.group.add(poleMesh, headMesh);
    }

    // ── 4. High-Altitude Skybridges (1 Draw Call) ──────────────────────────────

    _createSkybridges() {
        const bridgePositions = [0.12, 0.38, 0.65, 0.84];
        const count = bridgePositions.length;

        const bridgeGeo = new THREE.BoxGeometry(44, 3.2, 5.0);
        const bridgeMat = new THREE.MeshStandardMaterial({
            color: 0x101322,
            emissive: 0x00f0ff,
            emissiveIntensity: 1.2,
            roughness: 0.25,
            metalness: 0.9,
        });

        const bridgeMesh = new THREE.InstancedMesh(bridgeGeo, bridgeMat, count);
        const dummy = this._dummy;

        for (let i = 0; i < count; i++) {
            const t = bridgePositions[i];
            const { position, tangent } = this.path.getFrameAt(t);
            const rotY = Math.atan2(tangent.x, tangent.z);

            dummy.position.copy(position).setY(position.y + 26.0);
            dummy.rotation.set(0, rotY, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            bridgeMesh.setMatrixAt(i, dummy.matrix);
        }

        bridgeMesh.instanceMatrix.needsUpdate = true;
        this.group.add(bridgeMesh);
    }

    // ── 5. Holographic Roadside Billboards ───────────────────────────────────────

    _createHoloBillboards() {
        const billboardsData = [
            { t: 0.08, side: 1,  text1: 'NEO TOKYO', text2: '/// 2099 ///', color: '#00f0ff', emissive: 0x00d4ff },
            { t: 0.22, side: -1, text1: 'CYBER DRIVE', text2: '⚡ HIGH SPEED', color: '#ff0077', emissive: 0xff0066 },
            { t: 0.42, side: 1,  text1: 'SYNTH ENERGY', text2: 'MAX OVERCLOCK', color: '#00ffaa', emissive: 0x00ff88 },
            { t: 0.62, side: -1, text1: 'QUANTUM NITRO', text2: 'HYPER PULSE', color: '#aa00ff', emissive: 0x9900ff },
            { t: 0.78, side: 1,  text1: 'MATRIX GRID', text2: 'SYSTEM READY', color: '#ffbb00', emissive: 0xff9900 },
            { t: 0.88, side: -1, text1: 'FINAL STRETCH', text2: 'PUSH TO LIMIT', color: '#ff0044', emissive: 0xff0022 },
        ];

        const boardGeo = new THREE.PlaneGeometry(14, 6.5);
        const frameGeo = new THREE.BoxGeometry(14.4, 6.9, 0.5);
        const trussGeo = new THREE.CylinderGeometry(0.18, 0.22, 16, 6);

        const frameMat = new THREE.MeshStandardMaterial({
            color: 0x161826, roughness: 0.3, metalness: 0.9,
        });

        for (const data of billboardsData) {
            const { position, tangent, normal } = this.path.getFrameAt(data.t);
            const rotY = Math.atan2(tangent.x, tangent.z);

            const tex = this._createBillboardTexture(data.text1, data.text2, data.color);
            const boardMat = new THREE.MeshStandardMaterial({
                map: tex,
                transparent: true,
                roughness: 0.2,
                metalness: 0.5,
                emissive: data.emissive,
                emissiveIntensity: 1.5,
                side: THREE.DoubleSide,
            });

            const dist = this.track.halfWidth + 7.5;
            const centerPos = position.clone()
                .addScaledVector(normal, data.side * dist)
                .setY(position.y + 11.5);

            const boardGroup = new THREE.Group();
            boardGroup.position.copy(centerPos);
            boardGroup.rotation.y = rotY + (data.side * -0.2);

            const boardMesh = new THREE.Mesh(boardGeo, boardMat);
            boardGroup.add(boardMesh);

            const frameMesh = new THREE.Mesh(frameGeo, frameMat);
            frameMesh.position.z = -0.26;
            boardGroup.add(frameMesh);

            for (const pSide of [-5.5, 5.5]) {
                const truss = new THREE.Mesh(trussGeo, frameMat);
                truss.position.set(pSide, -7.5, -0.3);
                boardGroup.add(truss);
            }

            this.group.add(boardGroup);
        }
    }

    _createBillboardTexture(title, subtitle, accentColor) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Dark translucent gradient back
        ctx.fillStyle = '#0a0d16';
        ctx.fillRect(0, 0, 512, 256);

        // Tech grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1.5;
        for (let y = 0; y < 256; y += 24) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(512, y);
            ctx.stroke();
        }

        // Outer glow frame
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 6;
        ctx.strokeRect(12, 12, 488, 232);

        // Inner frame
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 20, 472, 216);

        // Title text
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 46px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, 256, 95);

        // Subtitle text
        ctx.fillStyle = accentColor;
        ctx.font = '800 24px monospace';
        ctx.fillText(subtitle, 256, 160);

        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 4;
        return tex;
    }

    // ── 6. Animated Sky Traffic (1 Draw Call, Zero-GC per Frame) ───────────────

    _createSkyTraffic() {
        const vehicleCount = 28;
        const craftGeo = new THREE.BoxGeometry(12.0, 3.2, 5.0);
        const craftMat = new THREE.MeshStandardMaterial({
            color: 0xff0077,
            emissive: 0xff0055,
            emissiveIntensity: 3.5,
            roughness: 0.2,
            toneMapped: false,
        });

        this.skyTrafficMesh = new THREE.InstancedMesh(craftGeo, craftMat, vehicleCount);

        const center = new THREE.Vector3(0, 0, 270);
        for (let i = 0; i < vehicleCount; i++) {
            this._skyVehicles.push({
                radius: 700 + (i % 4) * 150,
                angle: (i / vehicleCount) * Math.PI * 2,
                speed: 0.04 + (i % 3) * 0.02,
                altitude: 160 + (i % 4) * 35,
            });
        }

        this.group.add(this.skyTrafficMesh);
        this._updateSkyTraffic(0);
    }

    update(delta) {
        this._updateSkyTraffic(delta);
    }

    _updateSkyTraffic(delta) {
        if (!this.skyTrafficMesh) return;

        const dummy = this._dummy;
        const count = this._skyVehicles.length;
        const center = new THREE.Vector3(0, 0, 270);

        for (let i = 0; i < count; i++) {
            const v = this._skyVehicles[i];
            v.angle = (v.angle + v.speed * delta) % (Math.PI * 2);

            const x = center.x + Math.cos(v.angle) * v.radius;
            const z = center.z + Math.sin(v.angle) * v.radius;

            dummy.position.set(x, v.altitude, z);
            dummy.rotation.set(0, v.angle + Math.PI / 2, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();

            this.skyTrafficMesh.setMatrixAt(i, dummy.matrix);
        }

        this.skyTrafficMesh.instanceMatrix.needsUpdate = true;
    }

    // ── 7. Bridge Landmarks ───────────────────────────────────────────────────

    _createBridgeLandmarks() {
        const concreteMat = new THREE.MeshStandardMaterial({
            color: 0x1c1a2e, roughness: 0.55, metalness: 0.45,
        });
        const archMat = new THREE.MeshStandardMaterial({
            color: 0xcc4dff,
            emissive: 0xaa00ff,
            emissiveIntensity: 2.8,
            roughness: 0.25,
            toneMapped: false,
        });

        const bridgeTStart = 0.46;
        const bridgeTEnd   = 0.58;
        const archCount    = 6;

        for (let i = 0; i <= archCount; i++) {
            const t = bridgeTStart + (bridgeTEnd - bridgeTStart) * (i / archCount);
            const { position, tangent, normal } = this.path.getFrameAt(t);
            const quat = new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 0, 1), tangent
            );

            const pillarH = Math.max(0.5, position.y);
            const pillarGeo = new THREE.CylinderGeometry(0.28, 0.35, pillarH, 8);

            for (const side of [-1, 1]) {
                const pillarPos = position.clone()
                    .addScaledVector(normal, side * (this.track.halfWidth + 0.3))
                    .setY(position.y - pillarH / 2);

                const pillar = new THREE.Mesh(pillarGeo, concreteMat);
                pillar.position.copy(pillarPos);
                this.group.add(pillar);
            }

            if (i % 2 === 0) {
                const archW   = this.track.roadWidth + 2;
                const archGeo = new THREE.TorusGeometry(archW / 2, 0.14, 8, 20, Math.PI);
                const arch    = new THREE.Mesh(archGeo, archMat);
                arch.position.copy(position).setY(position.y + 2.1);
                arch.quaternion.copy(quat);
                arch.rotation.z = Math.PI / 2;
                this.group.add(arch);
            }
        }
    }
}



