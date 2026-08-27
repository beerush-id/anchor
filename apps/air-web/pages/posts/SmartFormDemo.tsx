import type { EventHandler, ChangeEvent, FocusEvent, ReactNode, FormEvent } from 'react';
import { setup, render, mutable, effect, createContext, form, snapshot, derived, type Bindable } from '@airlib/react';
import { z, type ZodType } from 'zod';
import type { ExceptionMap } from '@airlib/react';

export type FormContext = {
  state: Record<string, any>;
  errors: ExceptionMap<any>;
  get pending(): boolean;
};

export const formContext = createContext<FormContext>();
export const fieldContext = createContext<{ name: string }>();

export const InputField = setup<{
  type?: string;
  value?: Bindable<string>;
  onInput?: EventHandler<ChangeEvent<HTMLInputElement>>;
}>((props) => {
  const formState = formContext.get();
  const field = fieldContext.get();
  const withForm = formState && field;

  const output = derived(() => (withForm ? formState.state[field.name] : props.value));

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.currentTarget.value;

    if (withForm) {
      formState.state[field.name] = val;
    } else {
      props.value = val;
    }

    props.onInput?.(e);
  };

  return render(() => (
    <input
      type={props.type || 'text'}
      value={output.value ?? ''}
      onInput={handleInput}
      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-slate-900"
    />
  ));
});

export const NumberInput = setup<{
  value?: Bindable<number>;
  min?: number;
  onInput?: EventHandler<ChangeEvent<HTMLInputElement>>;
  onBlur?: EventHandler<FocusEvent<HTMLInputElement>>;
}>((props) => {
  const formState = formContext.get();
  const field = fieldContext.get();
  const withForm = formState && field;

  const output = derived(() => (withForm ? formState.state[field.name] : props.value));
  const raw = mutable({ value: String(output.value ?? ''), locked: false });

  effect(() => {
    if (raw.locked) return;
    raw.value = String(output.value ?? '');
  });

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    raw.locked = true;

    try {
      raw.value = e.currentTarget.value;
      if (!/\d+$/.test(raw.value)) return;

      const parsed = parseFloat(raw.value);
      const val = !isNaN(parsed) ? parsed : raw.value === '' ? (props.min ?? 0) : undefined;

      if (val !== undefined) {
        if (withForm) formState.state[field.name] = val;
        else props.value = val;
      }

      raw.locked = false;
    } finally {
      props.onInput?.(e);
    }
  };

  const restore = (e: FocusEvent<HTMLInputElement>) => {
    raw.value = String(output.value ?? '');
    raw.locked = false;
    props.onBlur?.(e);
  };

  return render(() => (
    <input
      type="text"
      value={raw.value}
      onInput={handleInput}
      onBlur={restore}
      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-slate-900"
    />
  ));
});

export function createForm<T extends ZodType>(schema: T, init?: z.infer<T>) {
  type FormData = z.infer<T>;

  const Form = setup<{
    data?: Partial<FormData>;
    pending?: Bindable<boolean>;
    onSubmit?: (data: FormData, e: FormEvent) => void | Promise<void>;
    children?: ReactNode;
  }>((props) => {
    const $props = props as any;

    const [state, errors] = form(schema as any, () => $props.data ?? init ?? {});

    formContext.set({
      state,
      errors,
      get pending() {
        return !!$props.pending;
      },
    });

    const handleSubmit = async (e: FormEvent) => {
      e.preventDefault();
      if ($props.pending || Object.keys(errors).length > 0) return;

      $props.pending = true;
      try {
        await $props.onSubmit?.(snapshot(state), e);
      } finally {
        $props.pending = false;
      }
    };

    return render(() => <form onSubmit={handleSubmit}>{$props.children}</form>);
  });

  const Field = setup<{ name: keyof FormData; label?: string; children?: ReactNode }>((props) => {
    const $props = props as any;
    const ctx = formContext.get();
    const error = derived(() => ctx?.errors[$props.name]?.message);

    fieldContext.set({ name: $props.name });

    return render(() => (
      <div className="flex flex-col gap-1.5 mb-5">
        {$props.label && <label className="text-sm font-semibold text-slate-700">{$props.label}</label>}
        {$props.children}
        {error.value && <span className="text-sm font-medium text-red-500 mt-1">{error.value}</span>}
      </div>
    ));
  });

  const Submit = setup<{ disabled?: Bindable<boolean>; children?: ReactNode }>((props) => {
    const $props = props as any;
    const ctx = formContext.get();

    return render(() => (
      <button
        type="submit"
        disabled={$props.disabled || ctx?.pending}
        className="w-full px-4 py-2.5 mt-2 text-white font-medium bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {$props.children}
      </button>
    ));
  });

  return Object.assign(Form, { Field, Submit });
}

const createProfile = async (data: any) => {
  return new Promise<void>((resolve) =>
    setTimeout(() => {
      console.log('Saved Profile:', data);
      resolve();
    }, 1500)
  );
};

const userSchema = z.object({
  email: z.string().email(),
  age: z.number().min(18),
});

const UserForm = createForm(userSchema);

export const Profile = setup(() => {
  return render(() => (
    <div className="w-full max-w-sm mx-auto p-8 bg-white rounded-xl shadow-lg border border-slate-100 my-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Edit Profile</h2>
        <p className="text-sm text-slate-500 mt-2">Update your account details below.</p>
      </div>

      <UserForm
        onSubmit={async (data, e) => {
          await createProfile(data);
        }}
      >
        <UserForm.Field name="email" label="Email Address">
          <InputField type="email" />
        </UserForm.Field>

        <UserForm.Field name="age" label="Age">
          <NumberInput min={18} />
        </UserForm.Field>

        <UserForm.Submit>Save Profile</UserForm.Submit>
      </UserForm>
    </div>
  ));
});
