import type { FC, SVGAttributes } from 'react';
import { classx } from '@anchorkit/headless/utils';
import type { ReactProps } from '../types.js';

export const ChevronDown: FC<ReactProps<SVGAttributes<SVGSVGElement>>> = ({ className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={classx('ark-icon', className)}
    {...props}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
