export const GAME_CONFIG = {
  roadWidth: 14,
  roadLength: 1600,
  laneWidth: 3.5,
  maxSpeed: 72,
  acceleration: 26,
  braking: 44,
  handling: 8
};

export const GAME_STATES = Object.freeze({
  MENU: 'menu',
  COUNTDOWN: 'countdown',
  RACING: 'racing',
  RESULTS: 'results'
});

export const FINISH_T = 0.96;
export const FINISH_DEAD_END_T = 0.985;
export const FINISH_BAND = 0.025;
export const LEADERBOARD_SIZE = 5;
export const LEADERBOARD_KEY = 'neonracer-leaderboard';

