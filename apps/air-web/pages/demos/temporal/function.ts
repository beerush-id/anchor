import type { RemoteState } from '@irpclib/irpc';
import { temporalRpc } from '@/pages/demos/temporal/api.js';

/**
 * Player model representing avatar position, identity, and temporal speech bubble.
 */
export type Player = {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  message?: string;
  joinedAt?: number;
  lastActive?: number;
};

/**
 * Aggregate room statistics.
 */
export type RoomStats = {
  totalJoined: number;
  activeCount: number;
};

export const MAX_PLAYERS = 500;

export const WORLD_SIZE = {
  width: 2000,
  height: 1200,
};

export const PLAYER_SIZE = 32;
export const PLAYER_RADIUS = PLAYER_SIZE / 2;
export const SPEED_PPS = 120; // Pixels per second (framerate-independent)

export const SPAWN_AREA = {
  minX: 850,
  maxX: 1150,
  minY: 450,
  maxY: 750,
};

/**
 * Full state snapshot synchronized to connected clients.
 * Uses a fixed-size 100 slots array to allow surgical index mutation without array reconciliation.
 */
export type TemporalState = {
  stats: RoomStats;
  players: (Player | null)[];
};

export type JoinInput = {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
};

export type MoveInput = {
  id: string;
  x: number;
  y: number;
};

export type ChatInput = {
  id: string;
  message: string;
};

export type JoinFn = (input: JoinInput) => RemoteState<TemporalState>;
export type MoveFn = (input: MoveInput) => Promise<void>;
export type ChatFn = (input: ChatInput) => Promise<void>;
export type LeaveFn = (id: string) => Promise<void>;

/**
 * Connect to the temporal world, spawn player, and stream real-time world state.
 */
const join = temporalRpc.declare<JoinFn>('player.join', {
  stream: true,
  seed: () => ({
    stats: { totalJoined: 0, activeCount: 0 },
    players: [],
  }),
  keepAlive: true,
});

/**
 * Update player coordinates in the virtual world.
 */
const move = temporalRpc.declare<MoveFn>('player.move');

/**
 * Broadcast a temporal chat message appearing above the player's avatar.
 */
const chat = temporalRpc.declare<ChatFn>('player.chat');

/**
 * Manually leave the room.
 */
const leave = temporalRpc.declare<LeaveFn>('player.leave');

export const temporal = {
  join,
  move,
  chat,
  leave,
};
