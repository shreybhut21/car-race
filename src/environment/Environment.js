import { createLighting } from './Lighting.js';
import { createSky } from './Sky.js';
import { addFog } from './Fog.js';

export function createEnvironment(scene, mapConfig = null) {
    createSky(scene);
    createLighting(scene);
    addFog(scene);
}

export function updateEnvironmentTheme(scene, mapConfig) {
    if (!mapConfig?.theme) return;
    scene.fog = null;
    if (scene.background) {
        scene.background.setHex(mapConfig.theme.skyBottom);
    }
}



