import { Leaderboard } from '../utils/Leaderboard.js';

export class ResultsScreen {
  constructor(options = {}) {
    this.options = Object.assign({
      onRaceAgain: null,
      onHome: null
    }, options);

    this.isVisible = false;
    this._createDOM();
    this._bindEvents();
  }

  _createDOM() {
    this.container = document.createElement('div');
    this.container.className = 'nr-results-screen hidden';
    this.container.innerHTML = `
      <div class="nr-results-bg"></div>
      <div class="nr-results-content">
        <div class="nr-results-header">
          <span class="nr-results-badge" id="nrResultsBadge">RACE COMPLETE</span>
          <h2 class="nr-results-title">FINISH!</h2>
        </div>

        <div class="nr-results-score-card">
          <p class="nr-results-player" id="nrResultsPlayer">RACER</p>
          
          <div class="nr-record-highlight hidden" id="nrRecordHighlight">
            <span class="nr-record-star">★</span>
            <span class="nr-record-text">NEW TRACK RECORD!</span>
            <span class="nr-record-star">★</span>
          </div>

          <div class="nr-results-metrics-grid">
            <div class="nr-metric-box main-time">
              <p class="nr-results-time-label">LAP TIME</p>
              <p class="nr-results-time" id="nrResultsTime">00:00:000</p>
            </div>
            <div class="nr-metric-box best-time" id="nrBestTimeBox">
              <p class="nr-results-time-label">TRACK RECORD</p>
              <p class="nr-best-record-time" id="nrBestRecordTime">00:00:000</p>
            </div>
          </div>

          <p class="nr-results-rank" id="nrResultsRank"></p>
        </div>

        <section class="nr-results-leaderboard">
          <h3 class="nr-results-lb-title" id="nrResultsLbTitle">TRACK LEADERBOARD</h3>
          <ol class="nr-results-lb-list" id="nrResultsLbList"></ol>
        </section>

        <div class="nr-results-actions">
          <button class="nr-results-btn secondary" id="nrHomeBtn" title="Exit to Main Menu (Esc)">
            <span class="nr-btn-icon">⌂</span> EXIT TO MENU
          </button>
          <button class="nr-results-btn primary" id="nrRaceAgainBtn" title="Race Again (Enter)">
            <span class="nr-btn-icon">↻</span> RACE AGAIN
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);

    this.playerEl          = this.container.querySelector('#nrResultsPlayer');
    this.timeEl            = this.container.querySelector('#nrResultsTime');
    this.bestRecordTimeEl  = this.container.querySelector('#nrBestRecordTime');
    this.recordHighlightEl = this.container.querySelector('#nrRecordHighlight');
    this.rankEl            = this.container.querySelector('#nrResultsRank');
    this.lbTitle           = this.container.querySelector('#nrResultsLbTitle');
    this.lbList            = this.container.querySelector('#nrResultsLbList');
    this.raceAgainBtn      = this.container.querySelector('#nrRaceAgainBtn');
    this.homeBtn           = this.container.querySelector('#nrHomeBtn');
  }

  _bindEvents() {
    this.raceAgainBtn.addEventListener('click', () => {
      this.hide();
      if (this.options.onRaceAgain) this.options.onRaceAgain();
    });

    this.homeBtn.addEventListener('click', () => {
      this.hide();
      if (this.options.onHome) this.options.onHome();
    });

    // Keyboard shortcuts: ESC -> Exit to Menu, Enter -> Race Again
    window.addEventListener('keydown', (e) => {
      if (!this.isVisible) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        this.hide();
        if (this.options.onHome) this.options.onHome();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.hide();
        if (this.options.onRaceAgain) this.options.onRaceAgain();
      }
    });
  }

  show({ name, timeMs, prevBest, isNewRecord, rank, mapId, mapName }) {
    this.isVisible = true;
    const activeMap = mapId || 'neon-metropolis';
    const activeMapName = mapName || (activeMap === 'synthwave-sunset' ? 'Synthwave Sunset' : activeMap === 'matrix-grid' ? 'Matrix Grid' : 'Neon Metropolis');

    this.playerEl.textContent = name || 'RACER';
    this.timeEl.textContent = Leaderboard.formatTime(timeMs);

    if (this.lbTitle) {
      this.lbTitle.textContent = `${activeMapName.toUpperCase()} — TOP 5`;
    }

    // Track record display
    const currentBest = Leaderboard.getBestTime(activeMap) || timeMs;
    this.bestRecordTimeEl.textContent = Leaderboard.formatTime(currentBest);

    if (isNewRecord) {
      this.recordHighlightEl.classList.remove('hidden');
    } else {
      this.recordHighlightEl.classList.add('hidden');
    }

    if (rank) {
      this.rankEl.innerHTML = `Leaderboard Standing: <strong>#${rank}</strong> on ${activeMapName}`;
      this.rankEl.style.display = 'block';
    } else {
      this.rankEl.textContent = 'Keep pushing — crack the top 5 next run!';
      this.rankEl.style.display = 'block';
    }

    this._renderLeaderboard(name, activeMap);
    this.container.classList.remove('hidden');
  }

  _renderLeaderboard(currentName, mapId) {
    const top = Leaderboard.getTop(5, mapId);
    this.lbList.innerHTML = '';

    const normCurrent = (currentName || '').trim().toLowerCase();

    top.forEach((entry, index) => {
      const isCurrent = (entry.name || '').trim().toLowerCase() === normCurrent;
      const li = document.createElement('li');
      li.className = `nr-results-lb-row${isCurrent ? ' highlight' : ''}`;
      li.innerHTML = `
        <span class="nr-lb-rank">#${index + 1}</span>
        <span class="nr-lb-name">${this._escape(entry.name || 'ANON')}</span>
        <span class="nr-lb-time">${Leaderboard.formatTime(entry.timeMs)}</span>
      `;
      this.lbList.appendChild(li);
    });
  }

  _escape(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  hide() {
    this.isVisible = false;
    this.container.classList.add('hidden');
  }

  destroy() {
    this.container?.remove();
  }
}


