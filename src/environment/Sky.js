import * as THREE from 'three';

export function createSky(scene) {
    const material = new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false,
        uniforms: { topColor: { value: new THREE.Color(0x03040e) }, horizonColor: { value: new THREE.Color(0x4c145f) }, bottomColor: { value: new THREE.Color(0x100718) } },
        vertexShader: `varying vec3 vWorldPosition; void main(){vec4 worldPosition=modelMatrix*vec4(position,1.);vWorldPosition=worldPosition.xyz;gl_Position=projectionMatrix*viewMatrix*worldPosition;}`,
        fragmentShader: `uniform vec3 topColor;uniform vec3 horizonColor;uniform vec3 bottomColor;varying vec3 vWorldPosition;void main(){float h=normalize(vWorldPosition).y;float horizon=exp(-abs(h)*6.);vec3 c=mix(bottomColor,topColor,smoothstep(-.3,.85,h));c=mix(c,horizonColor,horizon*.76);gl_FragColor=vec4(c,1.);}`
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(900, 32, 20), material));
    scene.background = new THREE.Color(0x100718);
}
