import { type InputHTMLAttributes } from 'react';
import { bindable } from '@anchorlib/react-classic/view';

export const Input = bindable<InputHTMLAttributes<HTMLInputElement>>((props) => <input {...props} />, 'Input');
