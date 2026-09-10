import { LEADERBOARD_KEY, LEADERBOARD_SIZE } from './Constants.js';

export const DEFAULT_MAP_SEEDS = {
  'neon-metropolis': [
    { name: 'CYBER_VIPER', timeMs: 74250, mapId: 'neon-metropolis' },
    { name: 'NEO_GHOST',   timeMs: 79800, mapId: 'neon-metropolis' },
    { name: 'SYNTH_BLADE', timeMs: 84650, mapId: 'neon-metropolis' },
    { name: 'CHROME_FOX',  timeMs: 91200, mapId: 'neon-metropolis' },
    { name: 'GRID_RUNNER', timeMs: 98500, mapId: 'neon-metropolis' }
  ],
  'synthwave-sunset': [
    { name: 'SUNSET_RIDER', timeMs: 71100, mapId: 'synthwave-sunset' },
    { name: 'MIAMI_HEAT',   timeMs: 76400, mapId: 'synthwave-sunset' },
    { name: 'PALM_DRIFTER', timeMs: 82300, mapId: 'synthwave-sunset' },
    { name: 'RETRO_WAVE',   timeMs: 88900, mapId: 'synthwave-sunset' },
    { name: 'DUSK_PHANTOM', timeMs: 95400, mapId: 'synthwave-sunset' }
  ],
  'matrix-grid': [
    { name: 'ZERO_COOL',    timeMs: 67800, mapId: 'matrix-grid' },
    { name: 'CYBER_PUNK',   timeMs: 73500, mapId: 'matrix-grid' },
    { name: 'NEXUS_CORE',   timeMs: 79900, mapId: 'matrix-grid' },
    { name: 'VECTOR_9',     timeMs: 85700, mapId: 'matrix-grid' },
    { name: 'GLITCH_DEVIL', timeMs: 92300, mapId: 'matrix-grid' }
  ]
};

export class Leaderboard {
  static getKey(mapId = null) {
    const validMap = mapId || 'neon-metropolis';
    return `${LEADERBOARD_KEY}_${validMap}`;
  }

  static getSeeds(mapId = null) {
    const validMap = mapId || 'neon-metropolis';
    return (DEFAULT_MAP_SEEDS[validMap] || DEFAULT_MAP_SEEDS['neon-metropolis']).map(e => ({ ...e }));
  }

  static load(mapId = null) {
    const validMap = mapId || 'neon-metropolis';
    try {
      const key = this.getKey(validMap);
      const raw = localStorage.getItem(key);
      if (!raw) {
        // Return seeded arcade defaults
        return this.getSeeds(validMap);
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return this.getSeeds(validMap);
    } catch {
      return this.getSeeds(validMap);
    }
  }

  static save(entries, mapId = null) {
    const validMap = mapId || 'neon-metropolis';
    const key = this.getKey(validMap);
    try {
      localStorage.setItem(key, JSON.stringify(entries));
    } catch (e) {
      console.warn('Leaderboard save failed:', e);
    }
  }

  static normalizeName(name) {
    return (name || '').trim().replace(/\s+/g, ' ');
  }

  static isNameTaken(name, mapId = null) {
    // Deprecated for user registration blocking; kept for utility check
    return false;
  }

  static getTop(limit = LEADERBOARD_SIZE, mapId = null) {
    return this.load(mapId)
      .slice()
      .sort((a, b) => a.timeMs - b.timeMs)
      .slice(0, limit);
  }

  static getBestTime(mapId = null) {
    const top = this.getTop(1, mapId);
    return top.length > 0 ? top[0].timeMs : null;
  }

  static addScore(name, timeMs, mapId = null) {
    const validMap = mapId || 'neon-metropolis';
    const displayName = this.normalizeName(name) || 'RACER';
    const entries = this.load(validMap);

    const existing = entries.findIndex(
      (entry) => entry.name.toLowerCase() === displayName.toLowerCase()
    );

    const record = {
      name: displayName,
      timeMs,
      date: Date.now(),
      mapId: validMap
    };

    if (existing >= 0) {
      if (timeMs < entries[existing].timeMs) {
        entries[existing] = record;
      }
    } else {
      entries.push(record);
    }

    entries.sort((a, b) => a.timeMs - b.timeMs);
    const trimmed = entries.slice(0, LEADERBOARD_SIZE);
    this.save(trimmed, validMap);
    return this.getRank(displayName, validMap);
  }

  static getRank(name, mapId = null) {
    const displayName = this.normalizeName(name).toLowerCase();
    const top = this.getTop(LEADERBOARD_SIZE, mapId);
    const index = top.findIndex(
      (entry) => entry.name.toLowerCase() === displayName
    );
    return index >= 0 ? index + 1 : null;
  }

  static formatTime(timeMs) {
    if (typeof timeMs !== 'number' || isNaN(timeMs) || timeMs < 0) {
      return '--:--:---';
    }
    const mins = Math.floor(timeMs / 60000);
    const secs = Math.floor((timeMs % 60000) / 1000);
    const ms = Math.floor(timeMs % 1000);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(ms).padStart(3, '0')}`;
  }
}


