import { keyNavRef, NavDirection } from '@anchorkit/headless/actions';
import { type ClassList, type ClassName, classx } from '@anchorkit/headless/utils';
import { onCleanup, setup, template } from '@anchorlib/react';
import type { HTMLAttributes } from 'react';

export type TabListProps = HTMLAttributes<HTMLDivElement> & {
  className?: ClassName | ClassList;
  direction?: NavDirection;
  buttonSelector?: string;
};

export const TabList = setup((props: TabListProps) => {
  const ref = keyNavRef<HTMLDivElement>({
    direction: NavDirection.HORIZONTAL,
    buttonSelector: props.buttonSelector,
  });

  onCleanup(() => {
    ref.destroy();
  });

  const Template = template(() => {
    const { buttonSelector: _bs, children, className, ...restProps } = props;

    return (
      <div ref={ref} role="tablist" className={classx('ark-tab-list', className)} {...restProps}>
        {children}
      </div>
    );
  }, 'TabList');

  return <Template />;
}, 'TabList');
