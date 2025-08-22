import { type ComponentType, useEffect, useMemo, useState } from 'react';
import { createObserver, setObserver } from '@anchor/core';
import type { Bindable } from './types.js';

export type AnchoredProps = {
  _state_version: number;
};

export function useObserver(): [ComponentType, number] {
  const [version, setVersion] = useState(1);
  const [observer] = useMemo(() => {
    const observer = createObserver(() => {
      setVersion((current) => current + 1);
    });

    return [observer];
  }, []);

  useEffect(() => {
    return () => {
      observer.destroy();
    };
  }, [observer]);

  const unobserve = setObserver(observer);

  const Unobserve = () => {
    return <>{unobserve()}</>;
  };

  return [Unobserve, version];
}

export function observed<T>(Component: ComponentType<T & AnchoredProps>, displayName?: string) {
  if (displayName && !Component.displayName) {
    Component.displayName = displayName;
  }

  const Observed: ComponentType<T> = (props: T) => {
    const [Unobserve, version] = useObserver();

    return (
      <>
        <Component {...{ ...props, _state_version: version }} />
        <Unobserve />
      </>
    );
  };

  Observed.displayName = `Observed(${displayName || Component.displayName || Component.name || 'Component'})`;
  return Observed;
}
observed.displayName = 'Observed';

export function cleanProps<T extends Bindable>(props: T) {
  const newProps = { ...props };

  delete props._state_version;

  return newProps as T;
}
