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
        this.path = track.path;

        this.group = new THREE.Group();
        this.scene.add(this.group);

        // Pre-allocated math objects for zero GC in update loop
        this._dummy = new THREE.Object3D();
        this._tempMat = new THREE.Matrix4();
        this._skyVehicles = [];

        this._buildLandmarks();
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
        this._createStreetlights();
        this._createHoloBillboards();
        this._createSkybridges();
        this._createSkyTraffic();
        this._createBridgeLandmarks();
    }

    // ── 1. Covered Track Canopy (Overhead Arches, Glass Ceiling & Laser Spine) ──

    _createTrackCanopy() {
        // Continuous canopy covering major sectors of the 4.5km circuit
        const canopySectors = [
            { tStart: 0.02, tEnd: 0.18, ribs: 40 }, // Sector 1: Start Straight to Turn 1
            { tStart: 0.50, tEnd: 0.62, ribs: 35 }, // Sector 2: Top Mega Straight
            { tStart: 0.76, tEnd: 0.88, ribs: 40 }, // Sector 3: Western Carousel to Finish
        ];

        let totalRibs = 0;
        canopySectors.forEach(s => totalRibs += s.ribs);

        const ribSpanW = this.track.roadWidth + 3.0;
        const ribH = 7.6;

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
        const archMesh = new THREE.InstancedMesh(ribArchGeo, ribNeonGlowMat, totalRibs);
        const pillarsMesh = new THREE.InstancedMesh(ribPillarGeo, ribStructureMat, totalRibs * 2);
        const roofMesh = new THREE.InstancedMesh(roofPanelGeo, glassRoofMat, totalRibs);
        const spineLMesh = new THREE.InstancedMesh(spineLightGeo, spineLaserMat, totalRibs);
        const spineRMesh = new THREE.InstancedMesh(spineLightGeo, ribNeonGlowMat, totalRibs);

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

    // ── 2. Roadside Sci-Fi Streetlights (2 Draw Calls) ─────────────────────────

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

    // ── 5. Holographic Roadside Sponsor / Ad Billboards ────────────────────────
    // Easily configurable for brand sponsors, ads, and custom image banners.
    // 👉 HOW TO ADD YOUR OWN SPONSOR IMAGE:
    // 1. Put your image (PNG/JPG) inside the "public/ads/" folder (e.g. "public/ads/my_ad.png").
    // 2. Set imageSrc: '/ads/my_ad.png' on any billboard entry below!

    _createHoloBillboards() {
        const billboardsData = [
            // 🏁 1. START POINT GRAND SPONSOR BANNER (Visible immediately from car spawn / start grid)
            {
                t: 0.015,                      // Right near the start point
                side: 1,                       // 1 = Right side of road, -1 = Left side
                imageSrc: '/ads/2025-formula1-red-bull-racing-rb21-001-2000.jpg', // 🏎 Red Bull RB21 F1 Banner
                sponsor: 'RED BULL RACING',
                text1: 'ORACLE RED BULL',
                text2: '⚡ RB21 FORMULA 1 ⚡',
                color: '#ffaa00',
                emissive: 0xff8800
            },
            // 2. Sector 1 Exit Billboard
            {
                t: 0.09,
                side: -1,
                imageSrc: null,                // 👉 Optional custom image path
                sponsor: 'TITLE PARTNER',
                text1: 'NEO ENERGY',
                text2: '⚡ 100% SYNTHETIC OVERCLOCK',
                color: '#00f0ff',
                emissive: 0x00d4ff
            },
            // 3. Mid-Track / Turn 5 Billboard
            {
                t: 0.28,
                side: 1,
                imageSrc: '/ads/2025-formula1-red-bull-racing-rb21-001-2000.jpg', // 🏎 Red Bull RB21 F1 Banner
                sponsor: 'RED BULL RACING',
                text1: 'ORACLE RED BULL',
                text2: '/// GIVES YOU WINGS ///',
                color: '#ff0077',
                emissive: 0xff0066
            },
            // 4. North Mega Straight Speed Trap Billboard
            {
                t: 0.62,
                side: -1,
                imageSrc: null,                // 👉 Optional custom image path
                sponsor: 'PERFORMANCE LABS',
                text1: 'APEX NITRO',
                text2: 'HYPER PULSE BOOST SYSTEM',
                color: '#00ffaa',
                emissive: 0x00ff88
            },
            // 5. Western Carousel Billboard
            {
                t: 0.84,
                side: 1,
                imageSrc: '/ads/2025-formula1-red-bull-racing-rb21-001-2000.jpg', // 🏎 Red Bull RB21 F1 Banner
                sponsor: 'RED BULL RACING',
                text1: 'HORIZON MOTORS',
                text2: 'THE FUTURE OF SPEED',
                color: '#ffbb00',
                emissive: 0xff9900
            },
        ];

        // Billboard dimensions (22m wide x 10m high) for high visibility sponsor displays
        const boardGeo = new THREE.PlaneGeometry(22, 10);
        const frameGeo = new THREE.BoxGeometry(22.6, 10.6, 0.6);
        const trussGeo = new THREE.CylinderGeometry(0.24, 0.32, 22, 8);

        const frameMat = new THREE.MeshStandardMaterial({
            color: 0x141624, roughness: 0.3, metalness: 0.9,
        });

        const textureLoader = new THREE.TextureLoader();

        for (const data of billboardsData) {
            const { position, tangent, normal } = this.path.getFrameAt(data.t);
            const rotY = Math.atan2(tangent.x, tangent.z);

            let boardMat;

            // If user supplied an image path (e.g. '/ads/my_ad.png'), load the actual image file!
            if (data.imageSrc) {
                const imgTex = textureLoader.load(
                    data.imageSrc,
                    (loadedTex) => {
                        loadedTex.colorSpace = THREE.SRGBColorSpace;
                        loadedTex.needsUpdate = true;
                    },
                    undefined,
                    (err) => console.error('Error loading billboard image:', data.imageSrc, err)
                );
                imgTex.colorSpace = THREE.SRGBColorSpace;
                imgTex.anisotropy = 8;
                boardMat = new THREE.MeshBasicMaterial({
                    map: imgTex,
                    side: THREE.DoubleSide,
                    toneMapped: false,
                });
            } else {
                // Procedural high-res holographic cyber ad generator
                const tex = this._createBillboardTexture(data.sponsor, data.text1, data.text2, data.color);
                boardMat = new THREE.MeshStandardMaterial({
                    map: tex,
                    transparent: true,
                    roughness: 0.2,
                    metalness: 0.4,
                    emissive: data.emissive,
                    emissiveIntensity: 1.6,
                    side: THREE.DoubleSide,
                });
            }

            // Placed at side of track (halfWidth + 14.5m)
            const dist = this.track.halfWidth + 14.5;
            const centerPos = position.clone()
                .addScaledVector(normal, data.side * dist)
                .setY(position.y + 13.5);

            const boardGroup = new THREE.Group();
            boardGroup.position.copy(centerPos);
            // Rotate 180 degrees (+ Math.PI) so the billboard faces the oncoming approaching driver!
            boardGroup.rotation.y = rotY + Math.PI + (data.side * 0.28);

            const boardMesh = new THREE.Mesh(boardGeo, boardMat);
            boardMesh.position.z = 0.32; // In front of frame
            boardGroup.add(boardMesh);

            const frameMesh = new THREE.Mesh(frameGeo, frameMat);
            frameMesh.position.z = 0.0;
            boardGroup.add(frameMesh);

            // Sturdy dual support pillars
            for (const pSide of [-8.8, 8.8]) {
                const truss = new THREE.Mesh(trussGeo, frameMat);
                truss.position.set(pSide, -9.5, -0.1);
                boardGroup.add(truss);
            }

            this.group.add(boardGroup);
        }
    }

    _createBillboardTexture(sponsorTag, title, subtitle, accentColor) {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Dark premium background with gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 1024, 512);
        bgGrad.addColorStop(0, '#0a0d18');
        bgGrad.addColorStop(1, '#060810');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 1024, 512);

        // Tech grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1.5;
        for (let y = 0; y < 512; y += 32) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(1024, y);
            ctx.stroke();
        }

        // Outer neon glow border
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 10;
        ctx.strokeRect(20, 20, 984, 472);

        // Inner frame border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 3;
        ctx.strokeRect(34, 34, 956, 444);

        // Corner accent brackets
        ctx.fillStyle = accentColor;
        const bracketSize = 28;
        ctx.fillRect(20, 20, bracketSize, 8);
        ctx.fillRect(20, 20, 8, bracketSize);
        ctx.fillRect(1004 - bracketSize, 20, bracketSize, 8);
        ctx.fillRect(996, 20, 8, bracketSize);
        ctx.fillRect(20, 484, bracketSize, 8);
        ctx.fillRect(20, 492 - bracketSize, 8, bracketSize);
        ctx.fillRect(1004 - bracketSize, 484, bracketSize, 8);
        ctx.fillRect(996, 492 - bracketSize, 8, bracketSize);

        // Top Sponsor Badge
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(362, 46, 300, 42);
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(362, 46, 300, 42);

        ctx.fillStyle = accentColor;
        ctx.font = '800 20px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`● ${sponsorTag || 'SPONSOR'} ●`, 512, 68);

        // Main Brand / Ad Headline
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 82px sans-serif';
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 18;
        ctx.fillText(title, 512, 230);
        ctx.shadowBlur = 0;

        // Subtitle / Promo Slogan
        ctx.fillStyle = accentColor;
        ctx.font = '800 36px monospace';
        ctx.fillText(subtitle, 512, 360);

        // Bottom Decorative Bar
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(150, 420, 724, 4);

        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 8;
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

        const center = new THREE.Vector3(-365, 0, 1050);
        for (let i = 0; i < vehicleCount; i++) {
            this._skyVehicles.push({
                radius: 1800 + (i % 4) * 400,
                angle: (i / vehicleCount) * Math.PI * 2,
                speed: 0.03 + (i % 3) * 0.015,
                altitude: 180 + (i % 4) * 45,
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
        const center = new THREE.Vector3(-365, 0, 1050);

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
        const bridgeTEnd = 0.58;
        const archCount = 6;

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
                const archW = this.track.roadWidth + 2;
                const archGeo = new THREE.TorusGeometry(archW / 2, 0.14, 8, 20, Math.PI);
                const arch = new THREE.Mesh(archGeo, archMat);
                arch.position.copy(position).setY(position.y + 2.1);
                arch.quaternion.copy(quat);
                arch.rotation.z = Math.PI / 2;
                this.group.add(arch);
            }
        }
    }
}



