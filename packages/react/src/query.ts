import { $symbol, type AsyncStatus } from '@airlib/core';
import type { ReactNode } from 'react';
import { createSwitch, type SwitchProps, type SwitchSlotNode } from './switch.js';

export type QueryState = {
  status: AsyncStatus;
};

export type QueryNode = (<S extends QueryState>(props: SwitchProps<S>) => ReactNode) & {
  Slot: SwitchSlotNode<AsyncStatus>;
};

const QUERY_CTX = $symbol('query-slot');
const QUERY_KEY = 'status';

/**
 * A component that renders its children based on the status of an asynchronous operation.
 * @property for - The asynchronous operation to watch for.
 * @property children - The children to render.
 */
export const Query: QueryNode = createSwitch(QUERY_CTX, QUERY_KEY, 'Query') as never;

/**
 * A slot component for the {@link Query} component.
 * @property for - The status value to match against.
 * @property children - The children to render if the status matches.
 */
export const QuerySlot = Query.Slot;
