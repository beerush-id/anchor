import { mutable, safeRun } from '@airlib/react/core';
import { stream } from '@irpclib/irpc';
import { temporalRpc } from './api.js';
import {
  type ChatInput,
  type JoinInput,
  MAX_PLAYERS,
  type MoveInput,
  type TemporalState,
  temporal,
} from './function.js';

export const IDLE_TIMEOUT_MS = 60_000;
const IDLE_SWEEP_INTERVAL_MS = 10_000;

/**
 * In-memory room state with pre-allocated fixed slots for players.
 * Mutations perform surgical index assignments (no array push/splice/reconciliation).
 */
export const STATE = safeRun(() =>
  mutable<TemporalState>({
    stats: {
      totalJoined: 0,
      activeCount: 0,
    },
    players: Array.from({ length: MAX_PLAYERS }, () => null),
  })
);

const playerIndexes = new Map<string, number>();
const chatTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
let idleSweepTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Register handlers for temporal world RPC stubs.
 */
temporalRpc.construct(temporal.join, (input: JoinInput) =>
  stream((state) => {
    state.data = STATE;
    join(input);

    return () => {
      leave(input.id);
    };
  })
);

temporalRpc.construct(temporal.move, async ({ id, x, y }: MoveInput) => {
  const player = STATE.players[playerIndexes.get(id)!];
  if (!player) return;

  player.x = x;
  player.y = y;
  player.lastActive = Date.now();
});

temporalRpc.construct(temporal.chat, async ({ id, message }: ChatInput) => {
  const player = STATE.players[playerIndexes.get(id)!];
  if (!player) return;

  player.message = message;
  player.lastActive = Date.now();

  const timer = chatTimeouts.get(id);
  if (timer) clearTimeout(timer);

  chatTimeouts.set(
    id,
    setTimeout(() => {
      const p = STATE.players[playerIndexes.get(id)!];
      if (p) p.message = undefined;
      chatTimeouts.delete(id);
    }, 5000)
  );
});

temporalRpc.construct(temporal.leave, async (id: string) => {
  leave(id);
});

// Private Helpers & Room Mutators

const join = (input: JoinInput) => {
  const slot = findSlot();
  const now = Date.now();
  const player = Object.assign(input, { joinedAt: now, lastActive: now });

  STATE.players[slot] = player;
  playerIndexes.set(input.id, slot);

  STATE.stats.totalJoined++;
  STATE.stats.activeCount = playerIndexes.size;
  syncIdleSweeper();
};

const leave = (id: string) => {
  const slot = playerIndexes.get(id);
  if (slot !== undefined) {
    STATE.players[slot] = null;
    playerIndexes.delete(id);
    STATE.stats.activeCount = playerIndexes.size;
    syncIdleSweeper();
  }

  const timer = chatTimeouts.get(id);
  if (timer) {
    clearTimeout(timer);
    chatTimeouts.delete(id);
  }
};

const findSlot = (): number => {
  for (let i = 0; i < MAX_PLAYERS; i++) {
    if (!STATE.players[i]) return i;
  }

  let oldestIndex = 0;
  let oldestTime = Number.POSITIVE_INFINITY;

  for (let i = 0; i < MAX_PLAYERS; i++) {
    const p = STATE.players[i];
    if (p && p.lastActive < oldestTime) {
      oldestTime = p.lastActive;
      oldestIndex = i;
    }
  }

  const evicted = STATE.players[oldestIndex];
  if (evicted) leave(evicted.id);

  return oldestIndex;
};

const sweepIdle = () => {
  const now = Date.now();
  for (let i = 0; i < MAX_PLAYERS; i++) {
    const p = STATE.players[i];
    if (p && now - p.lastActive > IDLE_TIMEOUT_MS) {
      leave(p.id);
    }
  }
};

const syncIdleSweeper = () => {
  if (playerIndexes.size > 0 && !idleSweepTimer) {
    idleSweepTimer = setInterval(sweepIdle, IDLE_SWEEP_INTERVAL_MS);
  } else if (playerIndexes.size === 0 && idleSweepTimer) {
    clearInterval(idleSweepTimer);
    idleSweepTimer = null;
  }
};

export const resetRoomState = () => {
  if (idleSweepTimer) {
    clearInterval(idleSweepTimer);
    idleSweepTimer = null;
  }

  for (const timer of chatTimeouts.values()) {
    clearTimeout(timer);
  }
  chatTimeouts.clear();
  playerIndexes.clear();

  STATE.stats.totalJoined = 0;
  STATE.stats.activeCount = 0;

  for (let i = 0; i < MAX_PLAYERS; i++) {
    STATE.players[i] = null;
  }
};
