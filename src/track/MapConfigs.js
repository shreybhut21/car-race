import * as THREE from 'three';

export const MAP_CONFIGS = [
    {
        id: 'sunset',
        name: 'SUNSET',
        subtitle: '5.5 KM SUNSET GRAND PRIX',
        difficulty: 'PRO SPEEDWAY',
        difficultyClass: 'diff-hard',
        lengthKm: '5.5 KM',
        turns: '14 TURNS (DRAGON TAIL)',
        tag: 'SUNSET GP',
        description: 'Spectacular 5.5km sunset circuit featuring the technical Dragon’s Tail chicanes, eastern elevation sweeps, pure top-speed north mega-straight, and a glowing sunset horizon.',
        accentColor: '#ffaa00',
        secondaryColor: '#ff0077',
        svgPreview: `
            <svg viewBox="-30 -30 860 480" class="nr-map-svg-preview">
                <defs>
                    <linearGradient id="mapGradSunset" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#ffaa00" />
                        <stop offset="50%" stop-color="#ff0077" />
                        <stop offset="100%" stop-color="#9900ff" />
                    </linearGradient>
                    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <!-- Track Background Outer Glow -->
                <path d="M 296 420 L 370 420 Q 400 440 430 445 Q 480 395 520 390 Q 560 435 600 425 L 636 420 Q 730 410 735 310 Q 740 180 670 120 Q 600 65 480 65 L 170 65 Q 60 75 50 180 Q 40 300 120 370 Q 200 420 296 420 Z"
                    fill="none" stroke="#ffaa00" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" opacity="0.25" filter="url(#neonGlow)" />

                <!-- Main Track Ribbon -->
                <path d="M 296 420 L 370 420 Q 400 440 430 445 Q 480 395 520 390 Q 560 435 600 425 L 636 420 Q 730 410 735 310 Q 740 180 670 120 Q 600 65 480 65 L 170 65 Q 60 75 50 180 Q 40 300 120 370 Q 200 420 296 420 Z"
                    fill="none" stroke="url(#mapGradSunset)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />

                <!-- Center Dashed Line -->
                <path d="M 296 420 L 370 420 Q 400 440 430 445 Q 480 395 520 390 Q 560 435 600 425 L 636 420 Q 730 410 735 310 Q 740 180 670 120 Q 600 65 480 65 L 170 65 Q 60 75 50 180 Q 40 300 120 370 Q 200 420 296 420 Z"
                    fill="none" stroke="#ffffff" stroke-width="2.5" stroke-dasharray="8 8" stroke-linecap="round" opacity="0.9" />

                <!-- Start / Finish Checkered Badge -->
                <rect x="281" y="408" width="30" height="24" rx="4" fill="#000000" stroke="#ffaa00" stroke-width="2"/>
                <circle cx="296" cy="420" r="4" fill="#00ff66" />
                <text x="296" y="455" fill="#ffaa00" font-size="14" font-weight="900" font-family="monospace" text-anchor="middle">START</text>

                <!-- Direction Arrow -->
                <path d="M 330 420 L 360 420 M 350 414 L 360 420 L 350 426" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>

                <!-- Turn Markers (Sector 1 sharp turns + circuit) -->
                <g fill="#ff0044" stroke="#ffffff" stroke-width="2" font-size="11" font-weight="900" font-family="sans-serif" text-anchor="middle" dominant-baseline="central">
                    <circle cx="420" cy="445" r="11"/><text x="420" y="445" fill="#fff" stroke="none">1</text>
                    <circle cx="475" cy="392" r="11"/><text x="475" y="392" fill="#fff" stroke="none">2</text>
                    <circle cx="535" cy="435" r="11"/><text x="535" y="435" fill="#fff" stroke="none">3</text>
                    <circle cx="680" cy="400" r="11"/><text x="680" y="400" fill="#fff" stroke="none">4</text>
                    <circle cx="735" cy="290" r="11"/><text x="735" y="290" fill="#fff" stroke="none">5</text>
                    <circle cx="710" cy="180" r="11"/><text x="710" y="180" fill="#fff" stroke="none">6</text>
                    <circle cx="620" cy="95" r="11"/><text x="620" y="95" fill="#fff" stroke="none">7</text>
                    <circle cx="510" cy="65" r="11"/><text x="510" y="65" fill="#fff" stroke="none">8</text>
                    <circle cx="160" cy="65" r="11"/><text x="160" y="65" fill="#fff" stroke="none">9</text>
                    <circle cx="65" cy="140" r="11"/><text x="65" y="140" fill="#fff" stroke="none">10</text>
                    <circle cx="50" cy="240" r="11"/><text x="50" y="240" fill="#fff" stroke="none">11</text>
                    <circle cx="85" cy="330" r="11"/><text x="85" y="330" fill="#fff" stroke="none">12</text>
                    <circle cx="170" cy="405" r="11"/><text x="170" y="405" fill="#fff" stroke="none">13</text>
                </g>
            </svg>
        `,
        theme: {
            neonLeft: '#ffaa00',
            neonRight: '#ff0077',
            barrierLeftHex: 0xffaa00,
            barrierRightHex: 0xff0077,
            barrierBodyHex: 0x161220,
            laneEmissiveHex: 0x5a1836,
            lightHex: 0xffaa33,
            fogColorHex: 0x24081c,
            fogDensity: 0.0012,
            skyTop: 0x140624,
            skyHorizon: 0xff4818,
            skyBottom: 0x3d0b28,
            ambientHex: 0xff7d55,
            sunHex: 0xffb347,
        },
        controlPoints: [
            // ── Sector 1: Start Straight & Sharp "Dragon's Tail" Chicane Complex ──────
            new THREE.Vector3( -900, 0,     0), // 0  - Start line grid (t=0.00)
            new THREE.Vector3( -600, 0,     0), // 1  - Launch acceleration (t~0.04)
            new THREE.Vector3( -420, 0,     0), // 2  - High speed entry (t~0.07)

            // Sharp Turn 1 (Flick Right):
            new THREE.Vector3( -260, 0,  -130), // 3  - Turn 1 sharp right entry (t~0.09)
            new THREE.Vector3( -120, 0,  -150), // 4  - Turn 1 apex (t~0.11)

            // Sharp Turn 2 (Flick Left Chicane Apex):
            new THREE.Vector3(   30, 0,   -90), // 5  - Turn 2 sharp left transition (t~0.14)
            new THREE.Vector3(  170, 0,    90), // 6  - Turn 2 chicane crest (t~0.16)
            new THREE.Vector3(  310, 0,   140), // 7  - Turn 2 left apex (t~0.18)

            // Sharp Turn 3 (Counter-Flick Right):
            new THREE.Vector3(  450, 0,   110), // 8  - Turn 3 sharp right flick (t~0.20)
            new THREE.Vector3(  590, 0,   -70), // 9  - Turn 3 apex (t~0.22)
            new THREE.Vector3(  720, 0,   -90), // 10 - Turn 3 exit (t~0.24)

            // Turn 4 (Fast Left Transition into East Sweeper):
            new THREE.Vector3(  860, 0,     0), // 11 - Turn 4 left alignment (t~0.26)
            new THREE.Vector3( 1000, 0,    60), // 12 - Full throttle exit (t~0.28)

            // ── Turn 5: 90° High Speed Sweeper (East Entry) ──────────────────────────
            new THREE.Vector3( 1180, 0,   180), // 13 - Turn 5 entry sweep (t~0.30)
            new THREE.Vector3( 1380, 0,   420), // 14 - Turn 5 apex (t~0.32)
            new THREE.Vector3( 1450, 0,   700), // 15 - Turn 5 exit heading North (t~0.34)

            // ── Turns 6, 7, 8: Eastern Winding Sector & Elevation Waves ───────────────
            new THREE.Vector3( 1450, 1,  1000), // 16 - Turn 6 entry (t~0.37)
            new THREE.Vector3( 1350, 2,  1300), // 17 - Turn 6 apex (t~0.40)
            new THREE.Vector3( 1150, 3,  1550), // 18 - Turn 7 crest arc (t~0.43)
            new THREE.Vector3(  900, 2,  1750), // 19 - Turn 7 exit (t~0.46)
            new THREE.Vector3(  650, 1,  1950), // 20 - Turn 8 entry (t~0.49)
            new THREE.Vector3(  450, 0,  2050), // 21 - Turn 8 apex heading West (t~0.51)

            // ── Turn 9: Technical S-Chicane into Top Mega Straight ────────────────────
            new THREE.Vector3(  280, 0,  2020), // 22 - Chicane entry flick right (t~0.53)
            new THREE.Vector3(  120, 0,  2100), // 23 - Chicane transition flick left (t~0.55)
            new THREE.Vector3(  -80, 0,  2060), // 24 - Chicane exit onto top straight (t~0.57)

            // ── Sector 2: Top Mega Straight (Pure Top Speed Westbound, Z ~ 2060) ──────
            new THREE.Vector3( -400, 0,  2060), // 25 - Top straight acceleration (t~0.60)
            new THREE.Vector3( -800, 0,  2060), // 26 - Top straight 200+ km/h zone (t~0.64)
            new THREE.Vector3(-1200, 0,  2060), // 27 - Top straight speed trap (t~0.68)
            new THREE.Vector3(-1600, 0,  2060), // 28 - Top straight braking zone (t~0.72)

            // ── Turn 10: Technical Entry into Western Carousel ────────────────────────
            new THREE.Vector3(-1850, 0,  1950), // 29 - Turn 10 entry (t~0.75)
            new THREE.Vector3(-2050, 1,  1750), // 30 - Turn 10 apex (t~0.78)
            new THREE.Vector3(-2150, 2,  1450), // 31 - Turn 10 exit into carousel (t~0.81)

            // ── Sector 3: Western High-Banked Carousel (Turns 11, 12, 13) ─────────────
            new THREE.Vector3(-2180, 3,  1100), // 32 - Turn 11 high bank (t~0.84)
            new THREE.Vector3(-2100, 3,   750), // 33 - Turn 12 apex (t~0.87)
            new THREE.Vector3(-1900, 2,   450), // 34 - Turn 13 carousel exit (t~0.90)
            new THREE.Vector3(-1650, 1,   220), // 35 - Turn 13 sweep into straight (t~0.93)

            // ── Turn 14: Final Sweeper into Finish Line Straightaway ──────────────────
            new THREE.Vector3(-1400, 0,    80), // 36 - Turn 14 entry (t~0.95)
            new THREE.Vector3(-1180, 0,    10), // 37 - Finish line approach (t~0.97)
            new THREE.Vector3(-1020, 0,     0), // 38 - Straightening into start grid (t~0.99)
        ],
        bankZones: [
            { tStart: 0.08, tEnd: 0.13, maxBank:  0.08 }, // Turn 1 sharp right bank
            { tStart: 0.14, tEnd: 0.19, maxBank: -0.09 }, // Turn 2 sharp left bank
            { tStart: 0.20, tEnd: 0.25, maxBank:  0.08 }, // Turn 3 sharp right bank
            { tStart: 0.29, tEnd: 0.36, maxBank:  0.09 }, // Turn 5 East 90° sweeper bank
            { tStart: 0.37, tEnd: 0.51, maxBank:  0.09 }, // Turns 6-8 East winding bank
            { tStart: 0.52, tEnd: 0.58, maxBank: -0.06 }, // Turn 9 S-chicane
            { tStart: 0.74, tEnd: 0.81, maxBank:  0.06 }, // Turn 10 chicane
            { tStart: 0.82, tEnd: 0.94, maxBank: -0.12 }, // Western carousel high bank
            { tStart: 0.94, tEnd: 0.99, maxBank:  0.06 }, // Turn 14 exit sweeper
        ]
    },

    {
        id: 'austin',
        name: 'AUSTIN',
        subtitle: '4.8 KM FORMULA GRAND PRIX',
        difficulty: 'EXPERT GP',
        difficultyClass: 'diff-hard',
        lengthKm: '4.8 KM',
        turns: '14 TURNS',
        tag: 'PRO FORMULA',
        description: 'High-precision 4.8km Formula Grand Prix circuit featuring the uphill Turn 1, technical high-G Esses (Turns 2-5), sweeping downhill Carousel (Turns 6-8), DRS back straight, and the stadium chicane (Turns 12-14).',
        accentColor: '#ff0055',
        secondaryColor: '#00f0ff',
        svgPreview: `
            <svg viewBox="-30 -30 860 480" class="nr-map-svg-preview">
                <defs>
                    <linearGradient id="austinGrad1" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#ff0055" />
                        <stop offset="100%" stop-color="#ff0077" />
                    </linearGradient>
                    <linearGradient id="austinGrad2" x1="0%" y1="0%" x2="100%" y2="50%">
                        <stop offset="0%" stop-color="#00f0ff" />
                        <stop offset="100%" stop-color="#00b4d8" />
                    </linearGradient>
                    <linearGradient id="austinGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#ffe600" />
                        <stop offset="100%" stop-color="#ff9900" />
                    </linearGradient>
                    <filter id="austinGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="5" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <!-- Sector 1: Red Esses (Turns 1 - 5) -->
                <path d="M 460 380 L 290 380 Q 250 380 230 330 Q 210 270 240 230 Q 260 200 230 160 Q 200 120 180 80 Q 160 50 200 50"
                    fill="none" stroke="#ff0055" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" filter="url(#austinGlow)" />

                <!-- Sector 2: Cyan Carousel (Turns 6 - 8) -->
                <path d="M 200 50 Q 260 40 330 60 Q 420 90 480 160 Q 520 210 560 240"
                    fill="none" stroke="#00f0ff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" filter="url(#austinGlow)" />

                <!-- Sector 3: Yellow Back Straight & Stadium (Turns 9 - 14) -->
                <path d="M 560 240 Q 600 250 640 210 L 760 230 Q 800 240 780 290 L 720 340 Q 690 350 670 320 Q 650 300 640 380 L 460 380"
                    fill="none" stroke="#ffe600" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" filter="url(#austinGlow)" />

                <!-- Center Dash Line -->
                <path d="M 460 380 L 290 380 Q 250 380 230 330 Q 210 270 240 230 Q 260 200 230 160 Q 200 120 180 80 Q 160 50 200 50 Q 260 40 330 60 Q 420 90 480 160 Q 520 210 560 240 Q 600 250 640 210 L 760 230 Q 800 240 780 290 L 720 340 Q 690 350 670 320 Q 650 300 640 380 L 460 380"
                    fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="6 6" opacity="0.8" />

                <!-- Start / Finish Line Badge -->
                <rect x="445" y="368" width="30" height="24" rx="4" fill="#000000" stroke="#ffffff" stroke-width="2"/>
                <circle cx="460" cy="380" r="4" fill="#00ff66" />
                <text x="460" y="415" fill="#ffffff" font-size="12" font-weight="900" font-family="monospace" text-anchor="middle">START</text>

                <!-- Speed Trap Badge -->
                <rect x="360" y="325" width="68" height="24" rx="4" fill="#ff00cc" stroke="#ffffff" stroke-width="1.5"/>
                <text x="394" y="341" fill="#ffffff" font-size="9" font-weight="900" font-family="sans-serif" text-anchor="middle">SPEED TRAP</text>
                <circle cx="394" cy="380" r="4" fill="#ff00cc" />
                <line x1="394" y1="349" x2="394" y2="380" stroke="#ff00cc" stroke-width="2" />

                <!-- DRS Zone 1 Badge -->
                <rect x="235" y="90" width="76" height="24" rx="4" fill="#00cc44" stroke="#ffffff" stroke-width="1.5"/>
                <text x="273" y="106" fill="#ffffff" font-size="8" font-weight="900" font-family="sans-serif" text-anchor="middle">DRS ZONE 1</text>

                <!-- DRS Zone 2 Badge -->
                <rect x="680" y="385" width="76" height="24" rx="4" fill="#00cc44" stroke="#ffffff" stroke-width="1.5"/>
                <text x="718" y="401" fill="#ffffff" font-size="8" font-weight="900" font-family="sans-serif" text-anchor="middle">DRS ZONE 2</text>

                <!-- Turn Markers (01 to 14) -->
                <g fill="#0c0e18" stroke="#ffffff" stroke-width="2" font-size="10" font-weight="900" font-family="sans-serif" text-anchor="middle" dominant-baseline="central">
                    <circle cx="280" cy="390" r="11"/><text x="280" y="390" fill="#fff" stroke="none">01</text>
                    <circle cx="270" cy="335" r="11"/><text x="270" y="335" fill="#fff" stroke="none">02</text>
                    <circle cx="215" cy="275" r="11"/><text x="215" y="275" fill="#fff" stroke="none">03</text>
                    <circle cx="265" cy="205" r="11"/><text x="265" y="205" fill="#fff" stroke="none">04</text>
                    <circle cx="195" cy="140" r="11"/><text x="195" y="140" fill="#fff" stroke="none">05</text>
                    <circle cx="180" cy="50"  r="11"/><text x="180" y="50"  fill="#fff" stroke="none">06</text>
                    <circle cx="240" cy="65"  r="11"/><text x="240" y="65"  fill="#fff" stroke="none">07</text>
                    <circle cx="340" cy="25"  r="11"/><text x="340" y="25"  fill="#fff" stroke="none">08</text>
                    <circle cx="545" cy="245" r="11"/><text x="545" y="245" fill="#fff" stroke="none">09</text>
                    <circle cx="595" cy="190" r="11"/><text x="595" y="190" fill="#fff" stroke="none">10</text>
                    <circle cx="785" cy="250" r="11"/><text x="785" y="250" fill="#fff" stroke="none">11</text>
                    <circle cx="745" cy="340" r="11"/><text x="745" y="340" fill="#fff" stroke="none">12</text>
                    <circle cx="655" cy="310" r="11"/><text x="655" y="310" fill="#fff" stroke="none">13</text>
                    <circle cx="645" cy="390" r="11"/><text x="645" y="390" fill="#fff" stroke="none">14</text>
                </g>
            </svg>
        `,
        theme: {
            neonLeft: '#ff0055',
            neonRight: '#00f0ff',
            barrierLeftHex: 0xff0055,
            barrierRightHex: 0x00f0ff,
            barrierBodyHex: 0x141422,
            laneEmissiveHex: 0x2e1a4d,
            lightHex: 0x00f0ff,
            fogColorHex: 0x0a0c16,
            fogDensity: 0.0018,
            skyTop: 0x02040c,
            skyHorizon: 0x1a2e55,
            skyBottom: 0x080c18,
            ambientHex: 0x6e90d8,
            sunHex: 0x88bbff,
        },
        controlPoints: [
            // ── Start / Finish Straight & Speed Trap (Westbound, Z = 0) ───────────────
            new THREE.Vector3(  200, 0,     0), // 0  - Start line (t=0.00)
            new THREE.Vector3(    0, 0,     0), // 1  - Speed trap (t~0.03)
            new THREE.Vector3( -250, 0,     0), // 2  - DRS zone (t~0.06)
            new THREE.Vector3( -500, 0,     0), // 3  - Braking zone Turn 1 (t~0.09)

            // ── Turn 1 (Uphill Left-Hand Hairpin Sweeper) ─────────────────────────────
            new THREE.Vector3( -700, 0,    20), // 4  - Turn 1 entry (t~0.11)
            new THREE.Vector3( -850, 1,    80), // 5  - Turn 1 uphill crest (t~0.13)
            new THREE.Vector3( -950, 2,   180), // 6  - Turn 1 apex (t~0.15)
            new THREE.Vector3( -920, 3,   300), // 7  - Turn 1 exit (t~0.17)

            // ── Turns 2, 3, 4, 5 (The High-Speed Esses / Snake) ──────────────────────
            new THREE.Vector3( -800, 3,   400), // 8  - Turn 2 gentle right (t~0.19)
            new THREE.Vector3( -650, 3,   450), // 9  - Turn 2 apex (t~0.21)
            new THREE.Vector3( -600, 2,   560), // 10 - Turn 3 sharp left kink (t~0.23)
            new THREE.Vector3( -720, 2,   680), // 11 - Turn 3 apex (t~0.25)
            new THREE.Vector3( -700, 2,   800), // 12 - Turn 4 sharp right flick (t~0.27)
            new THREE.Vector3( -560, 2,   900), // 13 - Turn 4 apex (t~0.29)
            new THREE.Vector3( -650, 3,  1020), // 14 - Turn 5 climbing left (t~0.31)
            new THREE.Vector3( -780, 3,  1180), // 15 - Turn 5 ridge sweep (t~0.33)
            new THREE.Vector3( -850, 3,  1320), // 16 - Turn 5 exit (t~0.35)

            // ── Turns 6, 7, 8 (North-West Downhill Carousel - Cyan Sector) ───────────
            new THREE.Vector3( -850, 3,  1460), // 17 - Turn 6 sharp right corner (t~0.38)
            new THREE.Vector3( -750, 2,  1560), // 18 - Turn 6 apex (t~0.40)
            new THREE.Vector3( -580, 2,  1560), // 19 - Turn 7 fast right curve (t~0.42)
            new THREE.Vector3( -400, 1,  1500), // 20 - Turn 7 exit (t~0.44)
            new THREE.Vector3( -200, 1,  1380), // 21 - Turn 8 carousel entry (t~0.46)
            new THREE.Vector3(    0, 0,  1180), // 22 - Turn 8 mid downhill arc (t~0.48)
            new THREE.Vector3(  200, 0,   920), // 23 - Turn 8 high speed sweep (t~0.50)
            new THREE.Vector3(  360, 0,   680), // 24 - Turn 8 exit (t~0.52)

            // ── Turns 9, 10 (S-Chicane into Back Mega Straight) ───────────────────────
            new THREE.Vector3(  480, 0,   520), // 25 - Turn 9 left kink (t~0.55)
            new THREE.Vector3(  620, 0,   480), // 26 - Turn 9 chicane flick (t~0.57)
            new THREE.Vector3(  780, 0,   540), // 27 - Turn 10 right curve (t~0.59)
            new THREE.Vector3(  950, 0,   650), // 28 - Turn 10 apex onto back straight (t~0.61)

            // ── Sector 3: Back Mega Straight (DRS Zone, Yellow Sector) ────────────────
            new THREE.Vector3( 1150, 0,   680), // 29 - Back straight full throttle (t~0.64)
            new THREE.Vector3( 1350, 0,   600), // 30 - 220+ km/h speed zone (t~0.67)
            new THREE.Vector3( 1550, 0,   500), // 31 - DRS high speed trap (t~0.70)
            new THREE.Vector3( 1750, 0,   400), // 32 - Braking zone Turn 11 (t~0.73)

            // ── Turn 11 (Hard Braking Hairpin Right) ──────────────────────────────────
            new THREE.Vector3( 1920, 0,   300), // 33 - Turn 11 hairpin entry (t~0.76)
            new THREE.Vector3( 1950, 0,   180), // 34 - Turn 11 apex (t~0.78)
            new THREE.Vector3( 1880, 0,    80), // 35 - Turn 11 exit (t~0.80)

            // ── Turns 12, 13, 14 (Stadium Infield Technical Complex) ──────────────────
            new THREE.Vector3( 1720, 0,    50), // 36 - Turn 12 fast westward sweep (t~0.83)
            new THREE.Vector3( 1500, 0,    70), // 37 - Turn 12 mid (t~0.85)
            new THREE.Vector3( 1280, 0,   110), // 38 - Turn 12 exit (t~0.87)
            new THREE.Vector3( 1120, 0,   160), // 39 - Turn 13 sharp right entry (t~0.89)
            new THREE.Vector3( 1040, 0,   270), // 40 - Turn 13 apex (t~0.91)
            new THREE.Vector3(  950, 0,   280), // 41 - Turn 13 exit (t~0.93)
            new THREE.Vector3(  850, 0,   240), // 42 - Turn 14 sharp 90° left entry (t~0.95)
            new THREE.Vector3(  780, 0,   100), // 43 - Turn 14 apex (t~0.97)
            new THREE.Vector3(  600, 0,     0), // 44 - Alignment into start straight (t~0.99)
        ],
        bankZones: [
            { tStart: 0.10, tEnd: 0.18, maxBank:  0.10 }, // Turn 1 uphill left bank
            { tStart: 0.22, tEnd: 0.26, maxBank: -0.09 }, // Turn 3 left flick
            { tStart: 0.26, tEnd: 0.30, maxBank:  0.08 }, // Turn 4 right flick
            { tStart: 0.31, tEnd: 0.36, maxBank: -0.09 }, // Turn 5 left ridge
            { tStart: 0.38, tEnd: 0.52, maxBank:  0.11 }, // Turns 6-8 downhill carousel bank
            { tStart: 0.55, tEnd: 0.61, maxBank: -0.07 }, // Turns 9-10 S-chicane
            { tStart: 0.75, tEnd: 0.81, maxBank:  0.12 }, // Turn 11 hairpin bank
            { tStart: 0.89, tEnd: 0.94, maxBank:  0.08 }, // Turn 13 right flick
            { tStart: 0.94, tEnd: 0.98, maxBank: -0.09 }, // Turn 14 final left 90°
        ]
    }
];

export function getMapById(id) {
    return MAP_CONFIGS.find(m => m.id === id) || MAP_CONFIGS[0];
}
