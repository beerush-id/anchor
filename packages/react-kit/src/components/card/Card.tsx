import { type HTMLAttributes } from 'react';
import type { EFC } from '@base/index.js';
import { classx } from '@utils/index.js';

export const Card: EFC<HTMLAttributes<HTMLDivElement>, HTMLDivElement> = ({ className, children, ...props }) => {
  return (
    <div className={classx(classx.brand('card'), className)} {...props}>
      {children}
    </div>
  );
};
