import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CarController } from './CarController.js';
import { CarEffects } from './CarEffects.js';

export class Car {
    constructor(scene, input, track) {
        this.scene = scene;
        this.input = input;
        this.track = track;

        this.object = new THREE.Group();
        this.visual = new THREE.Group();
        this.object.add(this.visual);

        // 25 m down the first straight – clear of the green start line (z=0)
        // and the start gantry (z=−10). Player sees open road immediately.
        this.object.position.set(0, 0.46, 25);
        this.object.rotation.y = 0;   // +Z is the first straight

        this.scene.add(this.object);
        this.addPresentationLighting();

        this.controller = new CarController(
            this.object,
            this.input,
            this.track
        );

        this.effects = new CarEffects(this);

        this.loadModel();
    }

    addPresentationLighting() {
        this.tailLight = new THREE.PointLight(0xff174d, 1.5, 6.0, 2);
        this.tailLight.position.set(0, 0.6, -2.35);
        this.object.add(this.tailLight);

        this.underglow = new THREE.PointLight(0x8d2cff, 1.6, 6.5, 2);
        this.underglow.position.set(0, -0.15, 0);
        this.object.add(this.underglow);

        this.bodyFill = new THREE.PointLight(0xd7e5ff, 2.8, 8.5, 2);
        this.bodyFill.position.set(0, 2.2, -1.9);
        this.object.add(this.bodyFill);
    }

    loadModel() {
        const loader = new GLTFLoader();

        loader.load(
            '/models/BMW%20330i.glb',
            (gltf) => {
                const model = gltf.scene;
                model.position.set(0, 0, 0);
                model.scale.set(1.45, 1.45, 1.45);

                model.traverse((child) => {
                    const name = (child.name || '').toLowerCase();

                    // Hide stray asset artifacts from Sketchfab export
                    const isStray =
                        name === 'object_10' ||
                        name.startsWith('plane') ||
                        name === 'cube';

                    if (isStray) {
                        child.visible = false;
                        return;
                    }

                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                this.visual.add(model);
                console.log('BMW 330i loaded');
            },
            undefined,
            (error) => {
                console.error('BMW loading failed:', error);
            }
        );
    }

    update(delta) {
        this.controller.update(delta);
        this.effects.update(delta, this.controller.physics, this.input);
    }

    get speed() {
        return this.controller.speed;
    }

    get speedKmh() {
        return this.controller.speedKmh;
    }

    get speedNormalized() {
        return this.controller.speedNormalized;
    }
}
