import type { IRPCAdapter } from './adapter.js';
import type { IRPCCrudMeta, IRPCData } from './types.js';

export type IRPCDriver<Adapter extends IRPCAdapter> = Partial<
  Omit<Adapter, 'use' | 'attach' | 'dispatch' | 'drivers' | 'module'>
>;

/**
 * Base class for CRUD drivers that receive per-method resolved metadata on every call
 */
export abstract class IRPCCrudDriver {
  get?(meta: IRPCCrudMeta, id: IRPCData): Promise<IRPCData> | IRPCData;
  create?(meta: IRPCCrudMeta, data: IRPCData): Promise<IRPCData> | IRPCData;
  update?(meta: IRPCCrudMeta, id: IRPCData, data: IRPCData): Promise<IRPCData> | IRPCData;
  delete?(meta: IRPCCrudMeta, id: IRPCData): Promise<IRPCData> | IRPCData;
}
