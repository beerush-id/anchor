import { createRouter, MAX_AGE, RENDER_MODE } from '@anchorlib/react/router';
import type { ReactNode } from 'react';

export const router = createRouter<ReactNode>({
  renderMode: RENDER_MODE.IMMEDIATE,
  maxAge: MAX_AGE.DAY,
});
