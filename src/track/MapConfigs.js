import * as THREE from 'three';

export const MAP_CONFIGS = [
    {
        id: 'neon-metropolis',
        name: 'NEON METROPOLIS',
        subtitle: 'CYBER HIGHWAY OVERPASS',
        difficulty: 'MEDIUM',
        difficultyClass: 'diff-medium',
        lengthKm: '1.6 KM',
        turns: '12 TURNS',
        tag: 'ARCADE FAVORITE',
        description: 'Iconic city circuit featuring wide straightaways, flowing S-curves, and an 8m elevated neon overpass.',
        accentColor: '#ff2e93',
        secondaryColor: '#00f0ff',
        svgPreview: `
            <svg viewBox="-180 -50 360 650" class="nr-map-svg-preview">
                <path d="M 0 0 L 0 200 Q 55 270 120 310 Q 155 370 130 420 Q 80 450 0 540 Q -55 570 -120 550 Q -160 490 -155 400 L -130 280 L -80 80 Q -55 15 0 0 Z"
                    fill="none" stroke="url(#mapGrad0)" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M 0 0 L 0 200 Q 55 270 120 310 Q 155 370 130 420 Q 80 450 0 540 Q -55 570 -120 550 Q -160 490 -155 400 L -130 280 L -80 80 Q -55 15 0 0 Z"
                    fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="8 8" stroke-linecap="round" />
                <circle cx="0" cy="0" r="10" fill="#00f0ff" stroke="#ffffff" stroke-width="2" />
                <defs>
                    <linearGradient id="mapGrad0" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#00f0ff" />
                        <stop offset="50%" stop-color="#ff2e93" />
                        <stop offset="100%" stop-color="#a82aff" />
                    </linearGradient>
                </defs>
            </svg>
        `,
        theme: {
            neonLeft: '#00f0ff',
            neonRight: '#ff2e93',
            barrierLeftHex: 0x00f0ff,
            barrierRightHex: 0xff2e93,
            barrierBodyHex: 0x141022,
            laneEmissiveHex: 0x4d2b68,
            lightHex: 0x00f0ff,
            fogColorHex: 0x150928,
            fogDensity: 0.0045,
            skyTop: 0x03040e,
            skyHorizon: 0x4c145f,
            skyBottom: 0x100718,
            ambientHex: 0x9275df,
            sunHex: 0xc7b4ff,
        },
        controlPoints: [
            new THREE.Vector3(   0,  0,    0),
            new THREE.Vector3(   0,  0,  110),
            new THREE.Vector3(   0,  0,  200),
            new THREE.Vector3(  55,  0,  270),
            new THREE.Vector3( 120,  0,  310),
            new THREE.Vector3( 155,  0,  370),
            new THREE.Vector3( 130,  0,  420),
            new THREE.Vector3(  80,  0,  450),
            new THREE.Vector3(  40,  1,  490),
            new THREE.Vector3(   0,  8,  540),
            new THREE.Vector3( -55,  5,  570),
            new THREE.Vector3(-120,  0,  550),
            new THREE.Vector3(-160,  0,  490),
            new THREE.Vector3(-155,  0,  400),
            new THREE.Vector3(-130,  0,  280),
            new THREE.Vector3( -95,  0,  160),
            new THREE.Vector3( -80,  0,   80),
            new THREE.Vector3( -55,  0,   15),
        ],
        bankZones: [
            { tStart: 0.10, tEnd: 0.25, maxBank:  0.08 },
            { tStart: 0.30, tEnd: 0.40, maxBank: -0.06 },
            { tStart: 0.40, tEnd: 0.48, maxBank:  0.05 },
            { tStart: 0.58, tEnd: 0.70, maxBank: -0.09 },
        ]
    },

    {
        id: 'synthwave-sunset',
        name: 'SYNTHWAVE SUNSET',
        subtitle: 'OUTRUN COASTAL HIGHWAY',
        difficulty: 'HIGH SPEED',
        difficultyClass: 'diff-easy',
        lengthKm: '1.9 KM',
        turns: '8 TURNS',
        tag: 'DRIFT PARADISE',
        description: 'Wide sweeping ocean-side super-highway with gentle banking, golden hour haze, and top-speed straightaways.',
        accentColor: '#ffd700',
        secondaryColor: '#ff2e7e',
        svgPreview: `
            <svg viewBox="-240 -60 480 660" class="nr-map-svg-preview">
                <path d="M 0 0 L 0 160 Q 90 240 180 300 Q 220 380 160 460 Q 70 540 -40 560 Q -150 540 -210 420 Q -240 280 -160 160 Q -80 40 0 0 Z"
                    fill="none" stroke="url(#mapGrad1)" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M 0 0 L 0 160 Q 90 240 180 300 Q 220 380 160 460 Q 70 540 -40 560 Q -150 540 -210 420 Q -240 280 -160 160 Q -80 40 0 0 Z"
                    fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="8 8" stroke-linecap="round" />
                <circle cx="0" cy="0" r="10" fill="#ffd700" stroke="#ffffff" stroke-width="2" />
                <defs>
                    <linearGradient id="mapGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#ffd700" />
                        <stop offset="50%" stop-color="#ff2e7e" />
                        <stop offset="100%" stop-color="#ff7b00" />
                    </linearGradient>
                </defs>
            </svg>
        `,
        theme: {
            neonLeft: '#ffd700',
            neonRight: '#ff2e7e',
            barrierLeftHex: 0xffb800,
            barrierRightHex: 0xff1464,
            barrierBodyHex: 0x221018,
            laneEmissiveHex: 0x7a2245,
            lightHex: 0xffa033,
            fogColorHex: 0x3d1428,
            fogDensity: 0.0075,
            skyTop: 0x0a0218,
            skyHorizon: 0xa83232,
            skyBottom: 0x24081c,
            ambientHex: 0xdf9275,
            sunHex: 0xffd2a0,
        },
        controlPoints: [
            new THREE.Vector3(   0,  0,    0),
            new THREE.Vector3(   0,  0,  120),
            new THREE.Vector3(  45,  0,  210),
            new THREE.Vector3( 120,  0,  280),
            new THREE.Vector3( 190,  0,  340),
            new THREE.Vector3( 205,  1,  410),
            new THREE.Vector3( 150,  2,  480),
            new THREE.Vector3(  60,  3,  530),
            new THREE.Vector3( -50,  2,  550),
            new THREE.Vector3(-140,  1,  510),
            new THREE.Vector3(-200,  0,  430),
            new THREE.Vector3(-220,  0,  320),
            new THREE.Vector3(-190,  0,  200),
            new THREE.Vector3(-130,  0,  110),
            new THREE.Vector3( -60,  0,   30),
        ],
        bankZones: [
            { tStart: 0.12, tEnd: 0.35, maxBank:  0.09 },
            { tStart: 0.45, tEnd: 0.70, maxBank: -0.10 },
            { tStart: 0.75, tEnd: 0.92, maxBank: -0.07 },
        ]
    },

    {
        id: 'matrix-grid',
        name: 'MATRIX GRID',
        subtitle: 'CYBER UNDERGROUND CIRCUIT',
        difficulty: 'EXPERT',
        difficultyClass: 'diff-hard',
        lengthKm: '1.5 KM',
        turns: '16 TURNS',
        tag: 'HIGH INTENSITY',
        description: 'Dark technical underground circuit with tight chicanes, double hairpins, and rapid elevation shifts.',
        accentColor: '#00ff88',
        secondaryColor: '#00d4ff',
        svgPreview: `
            <svg viewBox="-200 -50 400 630" class="nr-map-svg-preview">
                <path d="M 0 0 L 0 140 Q -80 180 -130 250 Q -150 330 -80 370 Q 20 400 120 430 Q 170 480 120 540 Q 20 560 -70 510 Q -150 450 -140 370 L -120 250 Q -80 80 0 0 Z"
                    fill="none" stroke="url(#mapGrad2)" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M 0 0 L 0 140 Q -80 180 -130 250 Q -150 330 -80 370 Q 20 400 120 430 Q 170 480 120 540 Q 20 560 -70 510 Q -150 450 -140 370 L -120 250 Q -80 80 0 0 Z"
                    fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="8 8" stroke-linecap="round" />
                <circle cx="0" cy="0" r="10" fill="#00ff88" stroke="#ffffff" stroke-width="2" />
                <defs>
                    <linearGradient id="mapGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#00ff88" />
                        <stop offset="50%" stop-color="#00d4ff" />
                        <stop offset="100%" stop-color="#00ffaa" />
                    </linearGradient>
                </defs>
            </svg>
        `,
        theme: {
            neonLeft: '#00ff88',
            neonRight: '#00e5ff',
            barrierLeftHex: 0x00ff88,
            barrierRightHex: 0x00e5ff,
            barrierBodyHex: 0x081814,
            laneEmissiveHex: 0x006633,
            lightHex: 0x00ff88,
            fogColorHex: 0x051a14,
            fogDensity: 0.011,
            skyTop: 0x010c08,
            skyHorizon: 0x083828,
            skyBottom: 0x04160f,
            ambientHex: 0x55df92,
            sunHex: 0xa0ffd2,
        },
        controlPoints: [
            new THREE.Vector3(   0,  0,    0),
            new THREE.Vector3(   0,  0,  100),
            new THREE.Vector3( -40,  0,  160),
            new THREE.Vector3(-110,  1,  210),
            new THREE.Vector3(-140,  2,  270),
            new THREE.Vector3(-110,  4,  330),
            new THREE.Vector3( -30,  6,  360),
            new THREE.Vector3(  60,  5,  390),
            new THREE.Vector3( 130,  3,  430),
            new THREE.Vector3( 145,  1,  490),
            new THREE.Vector3(  90,  0,  540),
            new THREE.Vector3( -10,  0,  550),
            new THREE.Vector3( -90,  0,  500),
            new THREE.Vector3(-140,  0,  420),
            new THREE.Vector3(-145,  0,  310),
            new THREE.Vector3(-110,  0,  190),
            new THREE.Vector3( -65,  0,   90),
            new THREE.Vector3( -35,  0,   20),
        ],
        bankZones: [
            { tStart: 0.08, tEnd: 0.22, maxBank: -0.10 },
            { tStart: 0.28, tEnd: 0.42, maxBank:  0.11 },
            { tStart: 0.48, tEnd: 0.65, maxBank: -0.09 },
            { tStart: 0.72, tEnd: 0.88, maxBank: -0.12 },
        ]
    }
];

export function getMapById(id) {
    return MAP_CONFIGS.find(m => m.id === id) || MAP_CONFIGS[0];
}
