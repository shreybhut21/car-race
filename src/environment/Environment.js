import { createLighting } from './Lighting.js';
import { createSky, updateSkyTheme } from './Sky.js';
import { addFog } from './Fog.js';

export function createEnvironment(scene, mapConfig = null) {
    createSky(scene, mapConfig);
    createLighting(scene);
    addFog(scene);
}

export function updateEnvironmentTheme(scene, mapConfig) {
    if (!mapConfig?.theme) return;
    scene.fog = null;
    updateSkyTheme(mapConfig);
    if (scene.background) {
        scene.background.setHex(mapConfig.theme.skyBottom);
    }
}



