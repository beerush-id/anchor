import { type InputHTMLAttributes, useRef } from 'react';
import { flashNode } from '@lib/stats.js';
import { observed } from '@anchor/react';

export type InputProps<T extends Record<string, string>> = {
  bindTo: T;
  name: keyof T;
} & InputHTMLAttributes<HTMLInputElement>;

function InputComp<T extends Record<string, string>>({ bindTo, name, className, ...props }: InputProps<T>) {
  const ref = useRef(null);
  flashNode(ref.current);

  return (
    <input
      ref={ref}
      className={`w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-900 text-white placeholder-slate-500 transition-colors duration-200 outline-none ${className}`}
      name={name}
      value={bindTo[name]}
      onChange={(e) => {
        bindTo[name] = e.target.value as never;
      }}
      {...props}
    />
  );
}

export const Input = observed(InputComp, 'Input');
