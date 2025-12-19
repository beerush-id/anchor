import { ButtonGroupCtx, createButtonGroup, createButtonSwitch, getButtonGroup } from '@anchorkit/headless/states';
import { type ClassList, type ClassName, classx } from '@anchorkit/headless/utils';
import { contextProvider, derived, effect, nodeRef, onMount, render, setup } from '@anchorlib/react';
import type { ButtonHTMLAttributes, HTMLAttributes, MouseEventHandler } from 'react';

export const BtnSize = {
  default: 'none',
  sm: 'small',
  md: 'medium',
  lg: 'large',
} as const;
export type ButtonSize = (typeof BtnSize)[keyof typeof BtnSize];

export const BtnVariant = {
  default: 'none',
  outline: 'outline',
  ghost: 'ghost',
  link: 'link',
} as const;
export type ButtonVariant = (typeof BtnVariant)[keyof typeof BtnVariant];

export const BtnColor = {
  default: 'none',
  primary: 'primary',
  destructive: 'destructive',
} as const;
export type ButtonColor = (typeof BtnColor)[keyof typeof BtnColor];

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: ButtonSize | string;
  color?: ButtonColor | string;
  variant?: ButtonVariant | string;
  className?: ClassName | ClassList;
  active?: boolean;
};

const CONTROLLED_PROPS = ['color', 'variant', 'size', 'children', 'className', 'active'] as (keyof ButtonProps)[];

export function createButtonClass(props: ButtonProps) {
  return derived(() => {
    const { size, color, active, variant } = props;

    return {
      'ark-active': active,
      'ark-primary-button': color === BtnColor.primary,
      'ark-destructive-button': color === BtnColor.destructive,
      'ark-outline-button': variant === BtnVariant.outline,
      'ark-ghost-button': variant === BtnVariant.ghost,
      'ark-link-button': variant === BtnVariant.link,
      'ark-sm-button': size === BtnSize.sm,
      'ark-md-button': size === BtnSize.md,
      'ark-lg-button': size === BtnSize.lg,
    };
  });
}

export const createButton = (name = 'Button', defaultClass = 'ark-button') => {
  return setup<ButtonProps>((props) => {
    const className = createButtonClass(props);

    return render(
      () => (
        <button
          type={'button'}
          className={classx(defaultClass, className.value, props.className)}
          {...props.$omit(CONTROLLED_PROPS)}
        >
          {props.children}
        </button>
      ),
      name
    );
  }, name);
};

export type ToggleButtonProps = ButtonProps & {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
};

export function createToggleButton(name = 'ToggleButton', defaultClass = 'ark-toggle-button') {
  return setup<ToggleButtonProps>((props) => {
    const group = getButtonGroup();
    const state = createButtonSwitch({}, group);

    if (group && group.value === props.name && !props.checked) {
      props.checked = true;
    }

    // Sync props to state.
    effect(() => {
      state.name = props.name ?? '';
      state.checked = props.checked ?? false;
      state.disabled = props.disabled ?? false;
    });

    // Sync state to props.
    effect(() => {
      props.active = state.checked;
      props.checked = state.checked;
      props.onChange?.(state.checked);
    });

    const handleClick: MouseEventHandler<HTMLButtonElement> = (e) => {
      state.toggle();

      props.onClick?.(e);
    };

    const className = createButtonClass(props);

    return render(
      () => (
        <button
          role={'switch'}
          disabled={state.disabled || group?.disabled}
          aria-checked={state.ariaChecked}
          aria-disabled={state.disabled || group?.disabled}
          className={classx(defaultClass, className.value, props.className)}
          onClick={handleClick}
          {...props.$omit([...CONTROLLED_PROPS, 'checked', 'disabled', 'onClick', 'onChange'])}
        >
          {props.children}
        </button>
      ),
      name
    );
  }, name);
}

export const Button = createButton();
export const IconButton = createButton('IconButton', 'ark-icon-button');

export const ToolButton = createToggleButton('ToolButton', 'ark-tool-button');
export const ToggleButton = createToggleButton();

export type ButtonGroupProps = HTMLAttributes<HTMLDivElement> & {
  value?: string;
  values?: string[];
  multiple?: boolean;
  disabled?: boolean;
  onChange?: (value: string) => void;
  onMultipleChange?: (values: string[]) => void;
};

export const ButtonGroup = setup<ButtonGroupProps>((props) => {
  const group = createButtonGroup();
  const Context = contextProvider(ButtonGroupCtx, 'ButtonGroupContext');

  let mounted = false;

  onMount(() => {
    mounted = true;
  });

  // Sync props to state.
  effect(() => {
    group.value = props.value ?? '';
    group.values = props.values ?? [];
    group.disabled = props.disabled ?? false;
    group.multiple = props.multiple ?? false;
  });

  // Sync state to props.
  effect(() => {
    props.value = group.value;

    if (mounted) {
      props.onChange?.(group.value);
    }
  });
  effect(() => {
    props.values = group.values;

    if (mounted) {
      props.onMultipleChange?.(group.values);
    }
  });

  const groupRef = nodeRef<HTMLDivElement>(() => ({
    className: classx('ark-button-group', props.className),
  }));

  return render(
    () => (
      <Context value={group}>
        <div ref={groupRef} {...groupRef.attributes}>
          {props.children}
        </div>
      </Context>
    ),
    'ButtonGroup'
  );
}, 'ButtonGroup');
