import type { DevTool, Linkable, StateChange, StatePublicTracker } from '../types.js';

export type Plugin = {
  track?: StatePublicTracker;
  inspect?: (state: Linkable, event: StateChange) => void;
  devTool?: DevTool;
};

export const plugin: Plugin = {};
