import * as THREE from 'three';
import { Car } from '../car/Car.js';
import { Track } from '../track/Track.js';
import { TrackLandmarks } from '../track/TrackLandmarks.js';
import { MAP_CONFIGS } from '../track/MapConfigs.js';
import { ChaseCamera } from '../camera/ChaseCamera.js';
import { InputManager } from '../input/InputManager.js';
import { CameraUI } from '../ui/CameraUI.js';
import { HUD } from '../ui/HUD.js';
import { HomeScreen } from '../ui/HomeScreen.js';
import { MapSelectionScreen } from '../ui/MapSelectionScreen.js';
import { Countdown } from '../ui/Countdown.js';
import { ResultsScreen } from '../ui/ResultsScreen.js';
import { GameState } from './GameState.js';
import { RaceManager } from './RaceManager.js';
import { Leaderboard } from '../utils/Leaderboard.js';
import { GAME_STATES } from '../utils/Constants.js';
import { createEnvironment, updateEnvironmentTheme } from '../environment/Environment.js';
import { createBloom } from '../effects/Bloom.js';

export class Game {
    constructor() {
        this.state = new GameState();
        this.activeMap = MAP_CONFIGS[0];

        this.scene = new THREE.Scene();

        createEnvironment(this.scene, this.activeMap);

        this.camera = new THREE.PerspectiveCamera(
            70,
            window.innerWidth / window.innerHeight,
            0.1,
            2000
        );

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });

        this.renderer.setPixelRatio(
            Math.min(window.devicePixelRatio, 2)
        );

        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;

        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

        document.body.appendChild(this.renderer.domElement);

        this.composer = createBloom(this.renderer, this.scene, this.camera);

        this.clock = new THREE.Clock();

        this.input = new InputManager();
        this.input.setEnabled(false);

        this.track = new Track(this.scene, this.activeMap);

        this.landmarks = new TrackLandmarks(this.scene, this.track);

        this.car = new Car(
            this.scene,
            this.input,
            this.track
        );

        this.chaseCamera = new ChaseCamera(
            this.camera,
            this.car
        );

        this.cameraUI = new CameraUI(this.chaseCamera);
        this._setCameraUIVisible(false);

        this.raceManager = new RaceManager(this.track);

        this.hud = new HUD({
            onExit: () => this._goHome()
        });

        this.homeScreen = new HomeScreen({
            onStart: (name) => this._goToMapSelection(name)
        });

        this.mapSelectionScreen = new MapSelectionScreen({
            onSelectMapAndStart: (name, selectedMap) => this._loadMapAndStartRace(name, selectedMap),
            onBack: () => this._goHome()
        });

        this.countdown = new Countdown({
            onComplete: () => this._beginRace()
        });

        this.resultsScreen = new ResultsScreen({
            onRaceAgain: () => this._beginCountdown(this.state.playerName, true),
            onHome: () => this._goHome()
        });

        this._setupCameraInput();
        this.resetCar();
        this.homeScreen.show();

        window.addEventListener(
            'resize',
            () => this.handleResize()
        );
    }

    resetCar() {
        if (this.track && this.track.path) {
            const frame = this.track.path.getFrameAt(0.005);
            this.car.object.position.copy(frame.position).setY(frame.position.y + 0.46);
            const rotY = Math.atan2(frame.tangent.x, frame.tangent.z);
            this.car.object.rotation.set(0, rotY, 0);
        } else {
            this.car.object.position.set(-875, 0.46, 0);
            this.car.object.rotation.set(0, Math.PI / 2, 0);
        }

        if (this.car.controller && this.car.controller.physics) {
            this.car.controller.physics.forwardSpeed = 0;
            this.car.controller.physics.velocity.set(0, 0, 0);
            this.car.controller.physics.smoothedSteer = 0;
            this.car.controller.physics.rawSteering = 0;
            this.car.controller.physics.isDrifting = false;
            this.car.controller.physics.driftIntensity = 0;
        }
    }

    _setupCameraInput() {
        this.input.onAction((code) => {
            if (!this.state.is(GAME_STATES.RACING)) return;

            if (code === 'KeyC' || code === 'KeyV') {
                this.chaseCamera.cycleMode();
            } else if (code === 'Digit1') {
                this.chaseCamera.setMode(0);
            } else if (code === 'Digit2') {
                this.chaseCamera.setMode(1);
            } else if (code === 'Digit3') {
                this.chaseCamera.setMode(2);
            } else if (code === 'Digit4') {
                this.chaseCamera.setMode(3);
            }
        });
    }

    _setCameraUIVisible(visible) {
        if (this.cameraUI?.container) {
            this.cameraUI.container.style.display = visible ? '' : 'none';
        }
    }

    _goToMapSelection(name) {
        this.state.playerName = name;
        this.homeScreen.hide();
        this.mapSelectionScreen.show(name);
    }

    _loadMapAndStartRace(name, selectedMap) {
        this.state.playerName = name;
        this.activeMap = selectedMap;

        // 1. Rebuild track and landmarks with chosen map layout and theme
        this.track.loadMap(selectedMap);
        this.landmarks.rebuild();
        updateEnvironmentTheme(this.scene, selectedMap);

        // 2. Hide map selection & begin countdown
        this.mapSelectionScreen.hide();
        this._beginCountdown(name);
    }

    _beginCountdown(name, isRetry = false) {
        this.state.playerName = name;
        this.state.setCountdown();

        this.homeScreen.hide();
        this.mapSelectionScreen.hide();
        this.resultsScreen.hide();
        this.hud.show();
        this.hud.resetTimer();
        this.hud.pauseTimer();
        this._setCameraUIVisible(true);

        this.resetCar();
        this.raceManager.reset();
        this.input.setEnabled(false);

        this.countdown.start();
    }

    _beginRace() {
        this.state.setRacing();
        this.input.setEnabled(true);
        this.hud.startTimer();
    }

    _finishRace() {
        // 1. Immediately disable player inputs and freeze vehicle
        this.input.setEnabled(false);
        this.hud.pauseTimer();

        // 2. Stop car movement and reset physics forces
        if (this.car && this.car.controller && this.car.controller.physics) {
            const physics = this.car.controller.physics;
            physics.forwardSpeed = 0;
            physics.velocity.set(0, 0, 0);
            physics.smoothedSteer = 0;
            physics.rawSteering = 0;
            physics.isDrifting = false;
            physics.driftIntensity = 0;
        }

        // 3. Hide racing HUD and in-game camera selector
        this.hud.hide();
        this._setCameraUIVisible(false);

        // 4. Retrieve lap timing and test for new track record
        const timeMs = this.hud.getTimeMs();
        const mapId = this.activeMap ? this.activeMap.id : 'neon-metropolis';
        const prevBest = Leaderboard.getBestTime(mapId);
        const isNewRecord = !prevBest || timeMs < prevBest;
        const rank = Leaderboard.addScore(this.state.playerName, timeMs, mapId);

        // 5. Set results state & display the lap record results screen
        this.state.setResults(timeMs, rank);
        this.resultsScreen.show({
            name: this.state.playerName,
            timeMs,
            prevBest,
            isNewRecord,
            rank,
            mapId,
            mapName: this.activeMap ? this.activeMap.name : 'Neon Metropolis'
        });
    }


    _goHome() {
        this.state.setMenu();
        this.input.setEnabled(false);
        this.countdown.stop();
        this.hud.hide();
        this.hud.resetTimer();
        this.hud.pauseTimer();
        this.mapSelectionScreen.hide();
        this.resultsScreen.hide();
        this._setCameraUIVisible(false);
        this.resetCar();
        this.raceManager.reset();
        this.homeScreen.show();
    }

    reset() {
        this._goHome();
    }

    start() {
        this.animate();
    }

    animate() {
        requestAnimationFrame(
            () => this.animate()
        );

        const delta =
            Math.min(
                this.clock.getDelta(),
                0.05
            );

        switch (this.state.current) {
            case GAME_STATES.MENU:
                break;

            case GAME_STATES.COUNTDOWN:
                this.countdown.update(delta);
                this.car.update(delta);
                break;

            case GAME_STATES.RACING:
                this.car.update(delta);
                this.hud.update(this.car, delta);
                this.raceManager.checkFinish(this.car, () => this._finishRace());
                break;

            case GAME_STATES.RESULTS:
                break;
        }

        if (this.landmarks && this.landmarks.update) {
            this.landmarks.update(delta);
        }

        this.chaseCamera.update(delta);
        this.composer.render();
    }


    handleResize() {
        this.camera.aspect =
            window.innerWidth /
            window.innerHeight;

        this.camera.updateProjectionMatrix();

        this.renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

        this.composer.setSize(
            window.innerWidth,
            window.innerHeight
        );
    }
}
