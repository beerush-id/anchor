import type { SVGAttributes } from 'react';
import type { EFC } from '@base/index.js';
import { classx } from '@utils/index.js';

export const LoaderCircle: EFC<SVGAttributes<SVGElement>, SVGSVGElement> = ({ className, ...props }) => {
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
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
};
