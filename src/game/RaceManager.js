import { FINISH_T, FINISH_BAND } from '../utils/Constants.js';

export class RaceManager {
  constructor(track) {
    this.track = track;
    this.reset();
  }

  reset() {
    this.maxT = 0;
    this.prevT = 0;
    this.finished = false;
    this.lapStarted = false;
  }

  checkFinish(car, onFinish) {
    if (this.finished || !car?.object || !this.track?.path) return;

    const carPos = car.object.position;
    const { t } = this.track.path.closestPoint(carPos);

    if (t > this.maxT) {
      this.maxT = t;
    }

    // Mark lap active once the player moves down the track
    if (this.maxT > 0.15) {
      this.lapStarted = true;
    }

    // Physical projection relative to the finish line gantry (FINISH_T = 0.91)
    const finishPos = this.track.path.getPointAt(FINISH_T);
    const finishTan = this.track.path.getTangentAt(FINISH_T);
    const dx = carPos.x - finishPos.x;
    const dz = carPos.z - finishPos.z;
    const projFinishDist = finishTan.x * dx + finishTan.z * dz;

    // Trigger finish if car has completed the circuit and reached the finish line / dead-end
    const reachedFinishT = t >= (FINISH_T - 0.015);
    const crossedFinishPlane = projFinishDist >= -1.0;

    if (this.lapStarted && this.maxT > 0.45 && (reachedFinishT || (t >= 0.88 && crossedFinishPlane))) {
      this.finished = true;
      onFinish();
    }

    this.prevT = t;
  }
}

