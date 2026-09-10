import { MAP_CONFIGS } from '../track/MapConfigs.js';

export class MapSelectionScreen {
    constructor(options = {}) {
        this.options = Object.assign({
            onSelectMapAndStart: null,
            onBack: null
        }, options);

        this.playerName = '';
        this.selectedIndex = 0;
        this.isVisible = false;

        this._createDOM();
        this._bindEvents();
    }

    _createDOM() {
        this.container = document.createElement('div');
        this.container.className = 'nr-map-select-screen hidden';

        let cardsHTML = '';
        MAP_CONFIGS.forEach((map, index) => {
            cardsHTML += `
                <div class="nr-map-card ${index === 0 ? 'selected' : ''}" data-index="${index}" id="mapCard-${map.id}">
                    <div class="nr-map-card-glow"></div>
                    
                    <div class="nr-map-card-header">
                        <span class="nr-map-difficulty ${map.difficultyClass}">${map.difficulty}</span>
                        <span class="nr-map-tag">${map.tag}</span>
                    </div>

                    <div class="nr-map-preview-wrap">
                        ${map.svgPreview}
                    </div>

                    <div class="nr-map-card-body">
                        <h3 class="nr-map-title">${map.name}</h3>
                        <p class="nr-map-subtitle">${map.subtitle}</p>
                        <p class="nr-map-desc">${map.description}</p>
                    </div>

                    <div class="nr-map-stats-row">
                        <div class="nr-map-stat">
                            <span class="nr-stat-label">LENGTH</span>
                            <span class="nr-stat-val">${map.lengthKm}</span>
                        </div>
                        <div class="nr-map-stat">
                            <span class="nr-stat-label">LAYOUT</span>
                            <span class="nr-stat-val">${map.turns}</span>
                        </div>
                        <div class="nr-map-stat">
                            <span class="nr-stat-label">TYPE</span>
                            <span class="nr-stat-val">CIRCUIT</span>
                        </div>
                    </div>

                    <div class="nr-map-selected-badge">
                        <span>READY</span>
                    </div>
                </div>
            `;
        });

        this.container.innerHTML = `
            <div class="nr-map-select-bg">
                <div class="nr-map-grid-mesh"></div>
                <div class="nr-map-glow-orb"></div>
            </div>

            <div class="nr-map-select-content">
                <header class="nr-map-select-header">
                    <span class="nr-map-header-badge">STEP 2 : TRACK SELECTION</span>
                    <h1 class="nr-map-select-title">CHOOSE YOUR CIRCUIT</h1>
                    <p class="nr-map-select-tagline">Select your proving ground, <span class="nr-player-highlight" id="nrMapPlayerName">RACER</span>.</p>
                </header>

                <div class="nr-map-cards-container" id="nrMapCardsContainer">
                    ${cardsHTML}
                </div>

                <div class="nr-map-select-footer">
                    <button class="nr-map-btn secondary" id="nrMapBackBtn" title="Back to Driver Registration (Esc)">
                        <span class="nr-btn-arrow">←</span> BACK
                    </button>
                    <button class="nr-map-btn primary" id="nrMapLaunchBtn" title="Launch Race (Enter)">
                        LAUNCH RACE <span class="nr-btn-arrow">→</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(this.container);

        this.playerNameEl = this.container.querySelector('#nrMapPlayerName');
        this.cardEls = Array.from(this.container.querySelectorAll('.nr-map-card'));
        this.backBtn = this.container.querySelector('#nrMapBackBtn');
        this.launchBtn = this.container.querySelector('#nrMapLaunchBtn');
    }

    _bindEvents() {
        this.cardEls.forEach((card, index) => {
            card.addEventListener('click', () => {
                this._selectIndex(index);
            });
        });

        this.backBtn.addEventListener('click', () => {
            this.hide();
            if (this.options.onBack) this.options.onBack();
        });

        this.launchBtn.addEventListener('click', () => {
            this._handleLaunch();
        });

        // Keyboard controls: ArrowLeft, ArrowRight, Enter, Escape
        window.addEventListener('keydown', (e) => {
            if (!this.isVisible) return;

            if (e.key === 'ArrowLeft' || e.key === 'KeyA') {
                const prev = (this.selectedIndex - 1 + MAP_CONFIGS.length) % MAP_CONFIGS.length;
                this._selectIndex(prev);
            } else if (e.key === 'ArrowRight' || e.key === 'KeyD') {
                const next = (this.selectedIndex + 1) % MAP_CONFIGS.length;
                this._selectIndex(next);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                this._handleLaunch();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.hide();
                if (this.options.onBack) this.options.onBack();
            }
        });
    }

    _selectIndex(index) {
        this.selectedIndex = index;
        this.cardEls.forEach((card, i) => {
            card.classList.toggle('selected', i === index);
        });
    }

    _handleLaunch() {
        const selectedMap = MAP_CONFIGS[this.selectedIndex];
        this.hide();
        if (this.options.onSelectMapAndStart) {
            this.options.onSelectMapAndStart(this.playerName, selectedMap);
        }
    }

    show(playerName) {
        this.playerName = playerName || 'RACER';
        if (this.playerNameEl) {
            this.playerNameEl.textContent = this.playerName.toUpperCase();
        }
        this.isVisible = true;
        this.container.classList.remove('hidden');
    }

    hide() {
        this.isVisible = false;
        this.container.classList.add('hidden');
    }

    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
