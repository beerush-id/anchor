import { type InputHTMLAttributes } from 'react';
import { bindable } from '@anchorlib/react/view';

export const Input = bindable<InputHTMLAttributes<HTMLInputElement>>((props) => <input {...props} />, 'Input');
