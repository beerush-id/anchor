import { type HTMLAttributes } from 'react';
import { classx } from '@utils/index.js';
import type { EFC } from '@base/index.js';

export const CardFooter: EFC<HTMLAttributes<HTMLDivElement>, HTMLDivElement> = ({ className, children, ...props }) => {
  return (
    <div className={classx(classx.brand('card-footer'), className)} {...props}>
      {children}
    </div>
  );
};
