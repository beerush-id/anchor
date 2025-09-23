import type { BindingType, InitProps, InputBinding, InputBindingProps } from './Types.js';
import { type ChangeEvent, type FunctionComponent, useCallback } from 'react';
import { type Bindable, getRefState, isRef, resolveProps, useObserverRef, useValue } from '@base/index.js';

const CONVERTIBLE = new Set<BindingType | undefined>(['number', 'range', 'date']);

/**
 * A higher-order component (HOC) that wraps a given component to enable two-way data binding.
 *
 * This HOC provides automatic synchronization between the component's input value and a bindable state.
 * It handles various input types including text, number, range, date, checkbox, and radio inputs.
 *
 * @template Props - The props type of the wrapped component
 * @param Component - The component to be wrapped with binding functionality
 * @param displayName - Optional display name for the resulting component
 * @returns A new component with binding capabilities
 */
export function bindable<Props extends InitProps>(Component: FunctionComponent<Props>, displayName?: string) {
  if (displayName && !Component.displayName) {
    Component.displayName = displayName;
  }
  /**
   * The binding component that wraps the original component.
   *
   * @template Bind - The bindable state type
   * @template Kind - The binding type (text, number, date, etc.)
   */
  function Binding<Bind extends Bindable, Kind extends BindingType = 'text'>(
    props: InputBindingProps<Kind, Bind, Props>
  ) {
    const [observer] = useObserverRef();

    const { type, bind, bindKey, name, onChange, value, checked, ...allProps } = props as Props;
    const restProps = observer.run(() => resolveProps(allProps as Props));

    const key = isRef(bind) ? 'value' : (bindKey ?? name);
    const val = type === 'checkbox' || type === 'radio' ? (checked ?? false) : (value ?? '');

    const current = useValue(getRefState(bind), key) ?? val;

    const handleInputChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        if (!bind) return onChange?.(e);

        if (type !== 'checkbox' && type !== 'radio' && (e.target.value === null || e.target.value === undefined)) {
          delete bind[key];
          return onChange?.(e);
        }

        if (CONVERTIBLE.has(type) && !e.target.value) {
          delete bind[key];
          return onChange?.(e);
        }

        if (type === 'number' || type === 'range') {
          bind[key] = parseFloat(e.target.value);
        } else if (type === 'date') {
          bind[key] = new Date(e.target.value);
        } else if (type === 'checkbox' || type === 'radio') {
          bind[key] = e.target.checked ?? false;
        } else {
          bind[key] = e.target.value;
        }

        return onChange?.(e);
      },
      [bind, key]
    );

    if (type === 'checkbox' || type === 'radio') {
      return (
        <Component
          type={type}
          name={name}
          checked={current}
          onChange={handleInputChange}
          {...(restProps as never as Props)}
        />
      );
    } else {
      return (
        <Component
          type={type}
          name={name}
          value={current}
          onChange={handleInputChange}
          {...(restProps as never as Props)}
        />
      );
    }
  }

  Binding.displayName = `Binding(${displayName || Component.displayName || 'Anonymous'})`;
  return Binding as never as InputBinding<Props>;
}
