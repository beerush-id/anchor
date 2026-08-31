import type { DevTool, Linkable, StateChange, StatePublicTracker, StateReadTracker } from '../types.js';

export type Plugin = {
  track?: StatePublicTracker;
  inspect?: (state: Linkable, event: StateChange) => void;
  trackStatic?: StateReadTracker;
  devTool?: DevTool;
};

export const plugin: Plugin = {};
