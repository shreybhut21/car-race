import * as THREE from 'three';

export function createAssetLoader() {
  return {
    texture: (path) => new THREE.TextureLoader().load(path),
    gltf: async (path) => {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      return new GLTFLoader().loadAsync(path);
    }
  };
}
