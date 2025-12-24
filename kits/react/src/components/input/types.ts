import type { InputHTMLAttributes } from 'react';

export type InputBaseProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'>;
