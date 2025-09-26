import { classx } from '@utils/index.js';
import { type HTMLAttributes } from 'react';
import type { EFC } from '../types.js';

const { brand } = classx;

export const Section: EFC<HTMLAttributes<HTMLElement>, HTMLElement> = ({ className, ...props }) => {
  return (
    <section {...props} className={classx(brand('section-offset'), className)}>
      <div className={brand('section')}>{props.children}</div>
    </section>
  );
};

export const SectionTitle: EFC<HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement> = ({ className, ...props }) => {
  return (
    <h2 {...props} className={classx(brand('section-title'), className)}>
      <span className={brand('section-title-text')}>{props.children}</span>
    </h2>
  );
};

export const SectionDescription: EFC<HTMLAttributes<HTMLDivElement>, HTMLDivElement> = ({ className, ...props }) => {
  return (
    <div {...props} className={classx(brand('section-description'), className)}>
      {props.children}
    </div>
  );
};
