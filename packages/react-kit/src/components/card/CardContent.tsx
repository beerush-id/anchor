import { type HTMLAttributes } from 'react';
import { classx } from '@utils/index.js';
import type { EFC } from '@base/index.js';

export const CardContent: EFC<HTMLAttributes<HTMLDivElement>, HTMLDivElement> = ({ className, children, ...props }) => {
  return (
    <div className={classx(classx.brand('card-content'), className)} {...props}>
      {children}
    </div>
  );
};
