import { classx, type RFC } from '@utils/index.js';
import { debugRender, resolveProps, useObserver } from '@anchorlib/react';
import { useRef } from 'react';

const { brand } = classx;

export const Section: RFC<HTMLDivElement> = (props) => {
  const { ref, children, className, ...rest } = useObserver(() => resolveProps(props), [props]);
  const sectionRef = useRef(null);
  debugRender(ref ?? sectionRef);

  return (
    <section ref={ref ?? sectionRef} className={classx(brand('section-offset'), className)} {...rest}>
      <div className={classx(brand('section'))}>{children}</div>
    </section>
  );
};

export const SectionTitle: RFC<HTMLHeadingElement> = (props) => {
  const { ref, className, children, ...rest } = useObserver(() => resolveProps(props), [props]);
  const sectionTitleRef = useRef(null);
  debugRender(ref ?? sectionTitleRef);

  return (
    <h2 ref={ref ?? sectionTitleRef} className={classx(brand('section-title'), className)} {...rest}>
      <span className={brand('section-title-text')}>{children}</span>
    </h2>
  );
};

export const SectionDescription: RFC<HTMLDivElement> = (props) => {
  const { ref, className, children, ...rest } = useObserver(() => resolveProps(props));
  const sectionDescriptionRef = useRef(null);
  debugRender(ref ?? sectionDescriptionRef);

  return (
    <div ref={ref ?? sectionDescriptionRef} className={classx(brand('section-description'), className)} {...rest}>
      {children}
    </div>
  );
};
