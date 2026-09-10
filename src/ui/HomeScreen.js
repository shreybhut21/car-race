import { Leaderboard } from '../utils/Leaderboard.js';

const TRACKS = [
  { id: 'neon-metropolis', label: 'NEON METROPOLIS', short: 'NEON' },
  { id: 'synthwave-sunset', label: 'SYNTHWAVE SUNSET', short: 'SUNSET' },
  { id: 'matrix-grid', label: 'MATRIX GRID', short: 'MATRIX' }
];

export class HomeScreen {
  constructor(options = {}) {
    this.options = Object.assign({ onStart: null }, options);
    this.selectedMapId = TRACKS[0].id;
    this._createDOM();
    this._bindEvents();
    this.refreshLeaderboard();
  }

  _createDOM() {
    this.container = document.createElement('div');
    this.container.className = 'nr-home-screen';
    this.container.innerHTML = `
      <div class="nr-vx-grid" aria-hidden="true"></div><div class="nr-vx-speed-lines" aria-hidden="true"></div>
      <main class="nr-vx-shell">
        <header class="nr-vx-header">
          <button class="nr-vx-brand" data-home aria-label="Neon Racer home"><b>N</b><span>NEON<span>RACER</span></span></button>
          <nav class="nr-vx-nav" aria-label="Main navigation">
            <button class="active" data-standings>LEADERBOARD</button><button data-garage>GARAGE</button><button data-tracks>TRACKS</button><button data-season>SEASON</button>
          </nav>
          <div class="nr-vx-account"><span>ARCADE EDITION · LIVE</span><button data-signin>DRIVER SIGN IN</button></div>
        </header>

        <section class="nr-vx-hero-grid">
          <div class="nr-vx-hero">
            <p class="nr-vx-eyebrow"><i></i> WORLD CIRCUIT · 2026</p>
            <h1>OUTRUN<br><em>THE GRID</em></h1>
            <p class="nr-vx-intro">Thirty drivers. Three neon circuits. One local standings table that never sleeps. Enter your callsign and carve your name into the record.</p>
            <div class="nr-vx-actions"><button class="nr-vx-primary" data-start>START RACE</button><button class="nr-vx-secondary" data-standings>VIEW STANDINGS</button></div>
          </div>
          <section class="nr-vx-ranking" id="nrRanking" aria-label="Leaderboard">
            <header><b>RANKING</b><span>LOCAL RECORDS</span></header>
            <div class="nr-vx-tabs" id="nrLbMapTabs">${TRACKS.map((track, i) => `<button class="${i === 0 ? 'active' : ''}" data-map="${track.id}">${track.short}</button>`).join('')}</div>
            <ol id="nrLeaderboardList"></ol><p id="nrLeaderboardEmpty">No records yet — be the first on this circuit.</p>
          </section>
        </section>

        <section class="nr-vx-claim" id="nrClaim">
          <div><p>CLAIM YOUR NAME</p><h2>Claim your handle<br>before the grid forms.</h2><span>Two to sixteen characters. Once it's raced, it's yours on the local board.</span></div>
          <div class="nr-vx-form"><label for="nrPlayerName">YOUR CALLSIGN</label><div><input id="nrPlayerName" type="text" maxlength="16" placeholder="e.g. REDLINE_REX" autocomplete="off" spellcheck="false"><button data-claim>CLAIM</button></div><p id="nrNameError"></p><small>WASD / Arrows to drive · Space to drift</small></div>
        </section>

        <section class="nr-vx-stats"><article><b>3</b><strong>NIGHT TRACKS</strong><span>Neon boulevards, desert horizons, and a digital grid.</span></article><article><b>300</b><strong>TOP SPEED KM/H</strong><span>Full throttle down the straight in gear six.</span></article><article><b>60fps</b><strong>RACE SYNC</strong><span>Fluid arcade racing with responsive drift control.</span></article></section>
        <footer class="nr-vx-footer"><span>© 2026 NEON RACER — an arcade racing experience.</span><span><button>RULES</button><button>SUPPORT</button><button>PRESS KIT</button></span></footer>
      </main>`;
    document.body.appendChild(this.container);
    this.nameInput = this.container.querySelector('#nrPlayerName');
    this.nameError = this.container.querySelector('#nrNameError');
    this.claimBtn = this.container.querySelector('[data-claim]');
    this.leaderboardList = this.container.querySelector('#nrLeaderboardList');
    this.leaderboardEmpty = this.container.querySelector('#nrLeaderboardEmpty');
    this.mapTabs = this.container.querySelectorAll('[data-map]');
  }

  _bindEvents() {
    this.nameInput.addEventListener('input', () => this._validateName());
    this.nameInput.addEventListener('keydown', event => { if (event.key === 'Enter') this._handleStart(); });
    this.claimBtn.addEventListener('click', () => this._handleStart());
    this.container.querySelectorAll('[data-start], [data-signin]').forEach(button => button.addEventListener('click', () => this._focusClaim()));
    this.container.querySelectorAll('[data-standings]').forEach(button => button.addEventListener('click', () => this.container.querySelector('#nrRanking').scrollIntoView({ behavior: 'smooth', block: 'center' })));
    this.container.querySelector('[data-home]').addEventListener('click', () => this._focusClaim());
    this.mapTabs.forEach(tab => tab.addEventListener('click', () => {
      this.selectedMapId = tab.dataset.map;
      this.mapTabs.forEach(item => item.classList.toggle('active', item === tab));
      this.refreshLeaderboard();
    }));
  }

  _focusClaim() { this.container.querySelector('#nrClaim').scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => this.nameInput.focus(), 350); }

  _validateName() {
    const name = Leaderboard.normalizeName(this.nameInput.value);
    let error = '';
    if (name && name.length < 2) error = 'Callsign must be at least 2 characters.';
    else if (name && !/^[a-zA-Z0-9 _-]+$/.test(name)) error = 'Use letters, numbers, spaces, - or _ only.';
    this.nameError.textContent = error;
    this.nameInput.classList.toggle('invalid', Boolean(error));
    this.claimBtn.disabled = !name || Boolean(error);
    return !error && name ? name : null;
  }

  _handleStart() {
    const name = this._validateName();
    if (!name || !this.options.onStart) return;
    try { localStorage.setItem('neonracer-last-player', name); } catch {}
    this.options.onStart(name);
  }

  refreshLeaderboard() {
    const top = Leaderboard.getTop(5, this.selectedMapId);
    this.leaderboardList.innerHTML = '';
    this.leaderboardEmpty.hidden = Boolean(top?.length);
    if (!top?.length) return;
    top.forEach((entry, index) => {
      const li = document.createElement('li');
      li.innerHTML = `<b>${String(index + 1).padStart(2, '0')}</b><span>${this._escape(entry.name || 'ANON')}<small>${TRACKS.find(t => t.id === this.selectedMapId)?.label || 'CIRCUIT'}</small></span><strong>${Leaderboard.formatTime(entry.timeMs)}</strong>`;
      this.leaderboardList.appendChild(li);
    });
  }

  _escape(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
  show() {
    this.container.classList.remove('hidden');
    try { this.nameInput.value = localStorage.getItem('neonracer-last-player') || ''; } catch { this.nameInput.value = ''; }
    this._validateName(); this.refreshLeaderboard(); requestAnimationFrame(() => this.nameInput.focus());
  }
  hide() { this.container.classList.add('hidden'); }
  destroy() { this.container?.remove(); }
}

