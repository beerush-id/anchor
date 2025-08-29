import { setDevTool } from '@anchor/core';
import { StateDevTool } from '../tool.js';
import type { FC } from 'react';

setDevTool(new StateDevTool());

export const DevTool: FC = () => {
  return <>Anchor Dev Tools</>;
};
