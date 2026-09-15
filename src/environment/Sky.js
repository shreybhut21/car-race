import * as THREE from 'three';

let skyMesh = null;
let skyMaterial = null;

export function createSky(scene, mapConfig = null) {
    const topHex = mapConfig?.theme?.skyTop || 0x03040e;
    const horizonHex = mapConfig?.theme?.skyHorizon || 0x4c145f;
    const bottomHex = mapConfig?.theme?.skyBottom || 0x100718;

    skyMaterial = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        uniforms: {
            topColor: { value: new THREE.Color(topHex) },
            horizonColor: { value: new THREE.Color(horizonHex) },
            bottomColor: { value: new THREE.Color(bottomHex) }
        },
        vertexShader: `
            varying vec3 vWorldDir;
            void main() {
                vWorldDir = normalize(position);
                vec4 viewPos = viewMatrix * vec4(position, 0.0);
                viewPos.w = 1.0;
                gl_Position = projectionMatrix * viewPos;
                gl_Position.z = gl_Position.w * 0.99999;
            }
        `,
        fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 horizonColor;
            uniform vec3 bottomColor;
            varying vec3 vWorldDir;
            void main() {
                float h = vWorldDir.y;
                float horizon = exp(-abs(h) * 5.5);
                vec3 c = mix(bottomColor, topColor, smoothstep(-0.25, 0.85, h));
                c = mix(c, horizonColor, horizon * 0.85);
                gl_FragColor = vec4(c, 1.0);
            }
        `
    });

    const skyGeo = new THREE.SphereGeometry(100, 32, 20);
    skyMesh = new THREE.Mesh(skyGeo, skyMaterial);
    skyMesh.renderOrder = -1000;
    scene.add(skyMesh);
    scene.background = new THREE.Color(bottomHex);
    return skyMesh;
}

export function updateSkyTheme(mapConfig) {
    if (!skyMaterial || !mapConfig?.theme) return;
    if (mapConfig.theme.skyTop) skyMaterial.uniforms.topColor.value.set(mapConfig.theme.skyTop);
    if (mapConfig.theme.skyHorizon) skyMaterial.uniforms.horizonColor.value.set(mapConfig.theme.skyHorizon);
    if (mapConfig.theme.skyBottom) skyMaterial.uniforms.bottomColor.value.set(mapConfig.theme.skyBottom);
}
