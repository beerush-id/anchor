import { createContext } from '@anchorlib/core';
import type { RouterContext, TRec } from '@anchorlib/router';

export const docsCtx = createContext<RouterContext<TRec, TRec, TRec>>();
