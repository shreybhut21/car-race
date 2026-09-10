export class InputManager {
    constructor() {
        this.keys = new Set();
        this.actionListeners = [];
        this.enabled = true;

        window.addEventListener(
            'keydown',
            (event) => {
                if (!this.keys.has(event.code)) {
                    // Trigger single-press action listeners
                    for (const listener of this.actionListeners) {
                        try { listener(event.code, event); } catch (e) { console.error(e); }
                    }
                }
                this.keys.add(
                    event.code
                );
            }
        );

        window.addEventListener(
            'keyup',
            (event) => {
                this.keys.delete(
                    event.code
                );
            }
        );
    }

    onAction(callback) {
        this.actionListeners.push(callback);
    }

    isDown(code) {
        return this.keys.has(code);
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.keys.clear();
        }
    }

    get throttle() {
        if (!this.enabled) return 0;
        if (this.isDown('KeyW') || this.isDown('ArrowUp')) {
            return 1;
        }

        if (this.isDown('KeyS') || this.isDown('ArrowDown')) {
            return -1;
        }

        return 0;
    }

    get steering() {
        if (!this.enabled) return 0;
        // A/Left = -1 (left), D/Right = +1 (right)
        let steer = 0;
        if (this.isDown('KeyA') || this.isDown('ArrowLeft')) {
            steer -= 1;
        }
        if (this.isDown('KeyD') || this.isDown('ArrowRight')) {
            steer += 1;
        }
        return steer;
    }

    get handbrake() {
        if (!this.enabled) return false;
        return this.isDown('Space') || this.isDown('KeyX') || this.isDown('ShiftLeft');
    }
}