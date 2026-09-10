export class Countdown {
  constructor(options = {}) {
    this.options = Object.assign({
      onComplete: null,
      stepDuration: 0.85
    }, options);

    this._createDOM();
    this.active = false;
    this.stepIndex = 0;
    this.elapsed = 0;
    this.steps = ['3', '2', '1', 'GO!'];
  }

  _createDOM() {
    this.container = document.createElement('div');
    this.container.className = 'nr-countdown hidden';
    this.container.innerHTML = `
      <div class="nr-countdown-ring"></div>
      <div class="nr-countdown-digit" id="nrCountdownDigit">3</div>
      <p class="nr-countdown-label">GET READY</p>
    `;
    document.body.appendChild(this.container);
    this.digitEl = this.container.querySelector('#nrCountdownDigit');
  }

  start() {
    this.active = true;
    this.stepIndex = 0;
    this.elapsed = 0;
    this.container.classList.remove('hidden');
    this._showStep(0);
  }

  update(delta) {
    if (!this.active) return;

    this.elapsed += delta;

    if (this.elapsed >= this.options.stepDuration) {
      this.elapsed = 0;
      this.stepIndex += 1;

      if (this.stepIndex >= this.steps.length) {
        this.stop();
        if (this.options.onComplete) {
          this.options.onComplete();
        }
        return;
      }

      this._showStep(this.stepIndex);
    }
  }

  _showStep(index) {
    const value = this.steps[index];
    this.digitEl.textContent = value;
    this.digitEl.classList.remove('pop');
    void this.digitEl.offsetWidth;
    this.digitEl.classList.add('pop');

    if (value === 'GO!') {
      this.container.classList.add('go');
    } else {
      this.container.classList.remove('go');
    }
  }

  stop() {
    this.active = false;
    this.container.classList.add('hidden');
    this.container.classList.remove('go');
  }

  destroy() {
    this.container?.remove();
  }
}
