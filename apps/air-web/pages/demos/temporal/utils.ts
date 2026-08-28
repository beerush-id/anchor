import { SPAWN_AREA } from './function.js';

/**
 * Generate a random coordinate within the spawn lobby.
 */
export const randomSpawnCoord = () => ({
  x: Math.floor(Math.random() * (SPAWN_AREA.maxX - SPAWN_AREA.minX) + SPAWN_AREA.minX),
  y: Math.floor(Math.random() * (SPAWN_AREA.maxY - SPAWN_AREA.minY) + SPAWN_AREA.minY),
});
