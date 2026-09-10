import { GAME_STATES } from '../utils/Constants.js';

export class GameState {
  constructor() {
    this.current = GAME_STATES.MENU;
    this.playerName = '';
    this.lastTimeMs = 0;
    this.lastRank = null;
  }

  setMenu() {
    this.current = GAME_STATES.MENU;
  }

  setCountdown() {
    this.current = GAME_STATES.COUNTDOWN;
  }

  setRacing() {
    this.current = GAME_STATES.RACING;
  }

  setResults(timeMs, rank) {
    this.current = GAME_STATES.RESULTS;
    this.lastTimeMs = timeMs;
    this.lastRank = rank;
  }

  is(state) {
    return this.current === state;
  }
}
