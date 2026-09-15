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

    // Mark lap active only once player has clearly progressed past the first sector
    if (this.maxT > 0.25) {
      this.lapStarted = true;
    }

    // Physical projection relative to the finish line gantry (FINISH_T = 0.96)
    const finishPos = this.track.path.getPointAt(FINISH_T);
    const finishTan = this.track.path.getTangentAt(FINISH_T);
    const dx = carPos.x - finishPos.x;
    const dz = carPos.z - finishPos.z;
    const projFinishDist = finishTan.x * dx + finishTan.z * dz;

    // Trigger finish only if player completed the full circuit (passed 85% of track) and reaches the finish line
    const reachedFinishT = t >= (FINISH_T - 0.012);
    const crossedFinishPlane = projFinishDist >= -1.0;

    if (this.lapStarted && this.maxT > 0.85 && (reachedFinishT || (t >= 0.93 && crossedFinishPlane))) {
      this.finished = true;
      onFinish();
    }

    this.prevT = t;
  }
}

