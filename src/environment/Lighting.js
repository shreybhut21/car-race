import * as THREE from 'three';

export function createLighting(scene) {
    // Hemisphere for ambient fill – no GPU cost.
    scene.add(new THREE.HemisphereLight(0x9275df, 0x100817, 2.1));

    // Single directional key light with a smaller shadow map (1024 saves ~4× VRAM vs 2048).
    const key = new THREE.DirectionalLight(0xc7b4ff, 2.1);
    key.position.set(-14, 28, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);   // was 2048×2048 – half res, big perf win
    key.shadow.camera.left   = -26;
    key.shadow.camera.right  =  26;
    key.shadow.camera.top    =  26;
    key.shadow.camera.bottom = -26;
    key.shadow.camera.near   = 1;
    key.shadow.camera.far    = 120;   // tighter far plane = sharper shadows
    scene.add(key);

    // One subtle purple fill – no shadow needed.
    const purpleFill = new THREE.PointLight(0x9c2cff, 14, 24, 2);
    purpleFill.position.set(0, 2.2, 8);
    scene.add(purpleFill);
}
