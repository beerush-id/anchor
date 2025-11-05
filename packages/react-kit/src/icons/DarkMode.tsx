import type { EFC } from '@base/index.js';
import type { SVGAttributes } from 'react';
import { classx } from '@utils/index.js';

export const DarkMode: EFC<SVGAttributes<SVGGElement>, SVGSVGElement> = ({ className, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={classx(classx.brand('icon'), className)}
      {...props}
    >
      <path d="M18 5h4" />
      <path d="M20 3v4" />
      <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
    </svg>
  );
};
