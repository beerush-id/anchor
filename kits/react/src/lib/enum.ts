export const ARK_SIZE = {
  xs: 'xs',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
} as const;

export type ArkSize = (typeof ARK_SIZE)[keyof typeof ARK_SIZE];

export const ARK_COLOR = {
  info: 'info',
  danger: 'danger',
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  destructive: 'destructive',
} as const;

export type ArkColor = (typeof ARK_COLOR)[keyof typeof ARK_COLOR];

export const ARK_VARIANT = {
  chip: 'chip',
  ghost: 'ghost',
  solid: 'solid',
  outline: 'outline',
} as const;

export type ArkVariant = (typeof ARK_VARIANT)[keyof typeof ARK_VARIANT];
