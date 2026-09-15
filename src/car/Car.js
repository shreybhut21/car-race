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

        // Spawn player 25m down the first straight (t=0.005), facing forward along the track
        if (this.track && this.track.path) {
            const frame = this.track.path.getFrameAt(0.005);
            this.object.position.copy(frame.position).setY(frame.position.y + 0.46);
            const rotY = Math.atan2(frame.tangent.x, frame.tangent.z);
            this.object.rotation.set(0, rotY, 0);
        } else {
            this.object.position.set(-875, 0.46, 0);
            this.object.rotation.y = Math.PI / 2;
        }

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
        // Presentation lighting removed to prevent rear and ground light reflections
    }

    loadModel(modelPath = '/models/C44.glb') {
        const loader = new GLTFLoader();

        loader.load(
            modelPath,
            (gltf) => {
                const model = gltf.scene;

                // Compute bounding box for automatic scale and ground centering
                const bbox = new THREE.Box3().setFromObject(model);
                const size = bbox.getSize(new THREE.Vector3());
                const center = bbox.getCenter(new THREE.Vector3());

                // Center model at ground level (wheels on asphalt)
                model.position.set(-center.x, -bbox.min.y, -center.z);

                // Auto-orient if model length is aligned along X axis
                if (size.x > size.z * 1.3) {
                    model.rotation.y = Math.PI / 2;
                }

                // Auto-scale to realistic vehicle length (~5.0m for F1 / sports chassis)
                const maxDim = Math.max(size.x, size.z);
                if (maxDim > 0) {
                    const targetLength = 5.0;
                    const scaleFactor = targetLength / maxDim;
                    this.visual.scale.set(scaleFactor, scaleFactor, scaleFactor);
                }

                model.traverse((child) => {
                    const name = (child.name || '').toLowerCase();

                    // Hide stray asset artifacts if any
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
                        if (child.material) {
                            if (child.material.roughness !== undefined) {
                                child.material.roughness = Math.max(child.material.roughness, 0.35);
                            }
                            if (child.material.metalness !== undefined) {
                                child.material.metalness = Math.min(child.material.metalness, 0.7);
                            }
                        }
                    }
                });

                this.visual.add(model);
                console.log('Vehicle model successfully loaded:', modelPath);
            },
            undefined,
            (error) => {
                console.error('Failed to load C44.glb, falling back to BMW 330i:', error);
                if (modelPath !== '/models/BMW%20330i.glb') {
                    this.loadModel('/models/BMW%20330i.glb');
                }
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
