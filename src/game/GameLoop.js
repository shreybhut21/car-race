export class GameLoop {
  constructor(update, render) { this.update = update; this.render = render; this.previous = 0; }
  start() { requestAnimationFrame(this.frame.bind(this)); }
  frame(time) {
    const delta = Math.min((time - this.previous) / 1000 || 0, 0.05);
    this.previous = time;
    this.update(delta);
    this.render();
    requestAnimationFrame(this.frame.bind(this));
  }
}
