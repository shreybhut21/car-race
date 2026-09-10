import { CAMERA_MODES } from '../camera/ChaseCamera.js';

export class CameraUI {
    constructor(chaseCamera) {
        this.chaseCamera = chaseCamera;
        this.container = null;
        this.toast = null;
        this.toastTimeout = null;
        this.buttons = [];

        this._createUI();
        this._bindEvents();
    }

    _createUI() {
        // Container
        this.container = document.createElement('div');
        this.container.className = 'nr-camera-ui';
        this.container.innerHTML = `
            <div class="nr-cam-bar">
                <div class="nr-cam-header">
                    <span class="nr-cam-icon">📹</span>
                    <span class="nr-cam-title">CAM VIEW</span>
                    <span class="nr-cam-hint">[C]</span>
                </div>
                <div class="nr-cam-pills">
                    ${CAMERA_MODES.map((mode, index) => `
                        <button class="nr-cam-pill ${index === 0 ? 'active' : ''}" data-index="${index}" title="Press ${mode.keyNumber} or click">
                            <span class="nr-pill-key">${mode.keyNumber}</span>
                            <span class="nr-pill-name">${mode.shortName}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
            <div class="nr-cam-toast" id="nrCamToast"></div>
        `;

        document.body.appendChild(this.container);

        this.toast = this.container.querySelector('#nrCamToast');
        this.buttons = Array.from(this.container.querySelectorAll('.nr-cam-pill'));

        this.buttons.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index, 10);
                this.chaseCamera.setMode(index);
            });
        });
    }

    _bindEvents() {
        this.chaseCamera.onModeChange((mode, index) => {
            this.updateActiveButton(index);
            this.showToast(mode);
        });
    }

    updateActiveButton(activeIndex) {
        this.buttons.forEach((btn, idx) => {
            if (idx === activeIndex) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    showToast(mode) {
        if (!this.toast) return;

        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }

        this.toast.innerHTML = `<span class="nr-toast-sub">CAMERA VIEW</span><span class="nr-toast-name">${mode.name.toUpperCase()}</span>`;
        this.toast.classList.add('visible');

        this.toastTimeout = setTimeout(() => {
            this.toast.classList.remove('visible');
        }, 1600);
    }
}
