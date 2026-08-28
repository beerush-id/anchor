import { withIsolation } from '@airlib/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDLE_TIMEOUT_MS, resetRoomState } from '@/pages/demos/temporal/constructor.js';
import { MAX_PLAYERS,  SPAWN_AREA, temporal } from '@/pages/demos/temporal/function.js';
import '@/pages/demos/temporal/constructor.js';

describe('Temporal Virtual World Logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetRoomState();
  });

  afterEach(() => {
    resetRoomState();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('spawns a player and streams world state', async () => {
    await withIsolation(async () => {
      const stream = temporal.join({
        id: 'player-1',
        name: 'Alice',
        color: '#ff0000',
        x: 1000,
        y: 600,
      });
      await Promise.resolve();

      expect(stream.data.stats.totalJoined).toBeGreaterThan(0);
      expect(stream.data.stats.activeCount).toBeGreaterThan(0);

      const player = stream.data.players.find((p) => p?.id === 'player-1');
      expect(player).toBeDefined();
      expect(player?.name).toBe('Alice');
      expect(player?.color).toBe('#ff0000');
      expect(player?.x).toBeGreaterThanOrEqual(SPAWN_AREA.minX);
      expect(player?.x).toBeLessThanOrEqual(SPAWN_AREA.maxX);
      expect(player?.y).toBeGreaterThanOrEqual(SPAWN_AREA.minY);
      expect(player?.y).toBeLessThanOrEqual(SPAWN_AREA.maxY);
    });
  });

  it('updates player position surgically on move', async () => {
    await withIsolation(async () => {
      const stream = temporal.join({
        id: 'player-2',
        name: 'Bob',
        color: '#00ff00',
        x: 1000,
        y: 600,
      });
      await Promise.resolve();

      await temporal.move({
        id: 'player-2',
        x: 500,
        y: 600,
      });

      const player = stream.data.players.find((p) => p?.id === 'player-2');
      expect(player?.x).toBe(500);
      expect(player?.y).toBe(600);
    });
  });

  it('broadcasts temporal chat message and expires after 5s', async () => {
    await withIsolation(async () => {
      const stream = temporal.join({
        id: 'player-3',
        name: 'Charlie',
        color: '#0000ff',
        x: 1000,
        y: 600,
      });
      await Promise.resolve();

      await temporal.chat({
        id: 'player-3',
        message: 'Hello world!',
      });

      let player = stream.data.players.find((p) => p?.id === 'player-3');
      expect(player?.message).toBe('Hello world!');

      // Fast-forward 5 seconds
      vi.advanceTimersByTime(5000);

      player = stream.data.players.find((p) => p?.id === 'player-3');
      expect(player?.message).toBeUndefined();
    });
  });

  it('resets chat expiration timer on rapid consecutive messages', async () => {
    await withIsolation(async () => {
      const stream = temporal.join({
        id: 'player-3b',
        name: 'Charlie B',
        color: '#0000ff',
        x: 1000,
        y: 600,
      });
      await Promise.resolve();

      await temporal.chat({ id: 'player-3b', message: 'First message' });
      vi.advanceTimersByTime(3000);

      // Send second message before 5s expires
      await temporal.chat({ id: 'player-3b', message: 'Second message' });

      // After 3s (total 6s from first message), second message should still be visible
      vi.advanceTimersByTime(3000);
      let player = stream.data.players.find((p) => p?.id === 'player-3b');
      expect(player?.message).toBe('Second message');

      // After additional 2s (total 5s from second message), message disappears
      vi.advanceTimersByTime(2000);
      player = stream.data.players.find((p) => p?.id === 'player-3b');
      expect(player?.message).toBeUndefined();
    });
  });

  it('kicks idle players after 1 minute of inactivity (watching without moving or chatting)', async () => {
    await withIsolation(async () => {
      const stream = temporal.join({
        id: 'idle-player',
        name: 'Sleepy',
        color: '#aaaaaa',
        x: 1000,
        y: 600,
      });
      await Promise.resolve();

      expect(stream.data.players.some((p) => p?.id === 'idle-player')).toBe(true);

      // Fast-forward past 1 minute idle threshold
      vi.advanceTimersByTime(IDLE_TIMEOUT_MS + 10_000);
      await Promise.resolve();

      expect(stream.data.players.some((p) => p?.id === 'idle-player')).toBe(false);
    });
  });

  it('keeps player active when interacting via move or chat', async () => {
    await withIsolation(async () => {
      const stream = temporal.join({
        id: 'active-player',
        name: 'Active',
        color: '#00ffff',
        x: 1000,
        y: 600,
      });
      await Promise.resolve();

      // Advance 45s
      vi.advanceTimersByTime(45_000);
      await Promise.resolve();

      // Active interaction (move) refreshes lastActive
      await temporal.move({ id: 'active-player', x: 250, y: 250 });
      await Promise.resolve();

      // Advance another 45s (total 90s elapsed, but only 45s since last interaction)
      vi.advanceTimersByTime(45_000);
      await Promise.resolve();

      expect(stream.data.players.some((p) => p?.id === 'active-player')).toBe(true);
    });
  });

  it('clears player slot on leave', async () => {
    await withIsolation(async () => {
      const stream = temporal.join({
        id: 'player-4',
        name: 'Dave',
        color: '#ffff00',
        x: 1000,
        y: 600,
      });
      await Promise.resolve();

      expect(stream.data.players.some((p) => p?.id === 'player-4')).toBe(true);
      const countBefore = stream.data.stats.activeCount;

      await temporal.leave('player-4');

      expect(stream.data.players.some((p) => p?.id === 'player-4')).toBe(false);
      expect(stream.data.stats.activeCount).toBe(countBefore - 1);
    });
  });

  it('evicts the most idle player when capacity exceeds MAX_PLAYERS', async () => {
    await withIsolation(async () => {
      // Fill up to capacity
      for (let i = 0; i < MAX_PLAYERS; i++) {
        temporal.join({
          id: `bot-slot-${i}`,
          name: `Bot ${i}`,
          color: '#888888',
          x: 1000,
          y: 600,
        });
        await Promise.resolve();
        // Stagger lastActive times
        vi.advanceTimersByTime(10);
      }

      // bot-slot-0 has the oldest lastActive
      // Joining bot-new should evict bot-slot-0
      const stream = temporal.join({
        id: 'bot-new',
        name: 'Bot New',
        color: '#ffffff',
        x: 1000,
        y: 600,
      });
      await Promise.resolve();

      expect(stream.data.players.some((p) => p?.id === 'bot-slot-0')).toBe(false);
      expect(stream.data.players.some((p) => p?.id === 'bot-new')).toBe(true);
      expect(stream.data.stats.activeCount).toBe(MAX_PLAYERS);
    });
  });
});
