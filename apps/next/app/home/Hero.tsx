'use client';

import { Card, CodeViewer, Section, SectionDescription, SectionTitle } from '@anchorlib/react-kit/components';
import { MainCTA } from '@components/MainCTA';

const anchorCode = `
import { useAnchor, observer } from '@anchorlib/react';

const Form = observer(() => {
  const [form] = useAnchor({ // [!code ++]
    email: '', // [!code ++]
    password: '', // [!code ++]
    get isValid() { // [!code ++]
      return this.email !== '' && this.password.length >= 8; // [!code ++]
    } // [!code ++]
  }); // [!code ++]

  return (
    <form>
      <input 
        type="email" 
        value={form.email}
        onChange={(e) => form.email = e.target.value} // [!code ++]
      />
      <input 
        type="password" 
        value={form.password}
        onChange={(e) => form.password = e.target.value} // [!code ++]
      />
      <button disabled={!form.isValid}>
        Submit
      </button>
    </form>
  );
});
`.trim();

const reactCode = `
import { useState, useMemo } from 'react';

const Form = () => {
  const [form, setForm] = useState({ // [!code --]
    email: '', // [!code --]
    password: '', // [!code --]
  }); // [!code --]

  const isValid = useMemo(() => { // [!code --]
    return form.email !== '' && form.password.length >= 8; // [!code --]
  }, [form.email, form.password]); // [!code --]

  return (
    <form>
      <input
        type="email"
        value={form.email}
        onChange={(e) => setForm(form => ({ ...form, email: e.target.value }))} // [!code --]
      />
      <input
        type="password"
        value={form.password}
        onChange={(e) => setForm(form => ({ ...form, password: e.target.value }))} // [!code --]
      />
      <button disabled={!isValid}>
        Submit
      </button>
    </form>
  );
};
`.trim();

const reduxCode = `
import { createSlice, configureStore } from '@reduxjs/toolkit';
import { Provider, useSelector, useDispatch } from 'react-redux';

const formSlice = createSlice({ // [!code --]
  name: 'form', // [!code --]
  initialState: { // [!code --]
    email: '', // [!code --]
    password: '', // [!code --]
  }, // [!code --]
  reducers: { // [!code --]
    setEmail: (state, action) => { state.email = action.payload; }, // [!code --]
    setPassword: (state, action) => { state.password = action.payload; } // [!code --]
  } // [!code --]
}); // [!code --]
const store = configureStore({ reducer: { form: formSlice.reducer } }); // [!code --]

const Form = () => {
  const form = useSelector((state) => state.form); // [!code --]
  const dispatch = useDispatch(); // [!code --]
  const isValid = form.email !== '' && form.password.length >= 8; // [!code --]

  return (
    <Provider store={store}>
      <form>
        <input 
          type="email" 
          value={form.email}
          onChange={(e) => dispatch(formSlice.actions.setEmail(e.target.value))} // [!code --]
        />
        <input 
          type="password" 
          value={form.password}
          onChange={(e) => dispatch(formSlice.actions.setPassword(e.target.value))} // [!code --]
        />
        <button disabled={!isValid}>
          Submit
        </button>
      </form>
    </Provider>
  );
};
`.trim();

const mobxCode = `
import { makeAutoObservable, action } from 'mobx';
import { observer } from 'mobx-react-lite';

class FormStore { // [!code --]
  email = ''; // [!code --]
  password = ''; // [!code --]

  constructor() { makeAutoObservable(this); } // [!code --]

  setEmail(email) { this.email = email; } // [!code --]
  setPassword(password) { this.password = password; } // [!code --]

  get isValid() { return this.email !== '' && this.password.length >= 8; } // [!code --]
} // [!code --]
const store = new FormStore(); // [!code --]

const Form = observer(() => {
  return (
    <form>
      <input
        type="email"
        value={store.email}
        onChange={(e) => store.setEmail(e.target.value)} // [!code --]
      />
      <input
        type="password"
        value={store.password}
        onChange={(e) => store.setPassword(e.target.value)} // [!code --]
      />
      <button disabled={!store.isValid}>
        Submit
      </button>
    </form>
  );
});
`.trim();

const jotaiCode = `
import { atom, useAtom } from 'jotai';

const formAtom = atom({ // [!code --]
  email: '', // [!code --]
  password: '', // [!code --]
}); // [!code --]
const isValidAtom = atom((get) => { // [!code --]
  const { email, password } = get(formAtom); // [!code --]
  return email !== '' && password.length >= 8; // [!code --]
}); // [!code --]

const Form = () => {
  const [form, setForm] = useAtom(formAtom); // [!code --]
  const [isValid] = useAtom(isValidAtom); // [!code --]

  return (
    <form>
      <input
        type="email"
        value={form.email}
        onChange={(e) => setForm(form => ({ ...form, email: e.target.value }))} // [!code --]
      />
      <input
        type="password"
        value={form.password}
        onChange={(e) => setForm(form => ({ ...form, password: e.target.value }))} // [!code --]
      />
      <button disabled={!isValid}>
        Submit
      </button>
    </form>
  );
};
`.trim();

const zustandCode = `
import { create } from 'zustand';

const useStore = create((set) => ({ // [!code --]
  form: { // [!code --]
    email: '', // [!code --]
    password: '', // [!code --]
  }, // [!code --]
  setEmail: (email) => set((state) => ({ form: { ...state.form, email } })), // [!code --]
  setPassword: (password) => set((state) => ({ form: { ...state.form, password } })), // [!code --]
})); // [!code --]

const Form = () => {
  const { form, setEmail, setPassword } = useStore(); // [!code --]
  const isValid = form.email !== '' && form.password.length >= 8; // [!code --]

  return (
    <form>
      <input
        type="email"
        value={form.email}
        onChange={(e) => setEmail(e.target.value)} // [!code --]
      />
      <input
        type="password"
        value={form.password}
        onChange={(e) => setPassword(e.target.value)} // [!code --]
      />
      <button disabled={!isValid}>
        Submit
      </button>
    </form>
  );
};
`.trim();

const anchorBlock = {
  name: 'Anchor',
  lang: 'tsx',
  icon: '/anchor-logo.svg',
  iconAlt: 'Anchor Logo',
  code: anchorCode,
};

const otherBlocks = [
  {
    name: 'React',
    lang: 'tsx',
    icon: '/images/logos/react.svg',
    iconAlt: 'React Logo',
    code: reactCode,
  },
  {
    name: 'Jotai',
    lang: 'tsx',
    icon: '/images/logos/react.svg',
    iconAlt: 'React Logo',
    code: jotaiCode,
  },
  {
    name: 'Zustand',
    lang: 'tsx',
    icon: '/images/logos/react.svg',
    iconAlt: 'React Logo',
    code: zustandCode,
  },
  {
    name: 'MobX',
    lang: 'tsx',
    icon: '/images/logos/react.svg',
    iconAlt: 'React Logo',
    code: mobxCode,
  },
  {
    name: 'Redux',
    lang: 'tsx',
    icon: '/images/logos/react.svg',
    iconAlt: 'React Logo',
    code: reduxCode,
  },
];

export function Hero() {
  return (
    <Section id="hero" className="page-section fill-screen-section">
      <SectionTitle className={'text-center'}>Reimagine React State</SectionTitle>
      <SectionDescription className={'md:mb-6 text-center'}>
        Stop thinking in setters, reducers, and selectors. Anchor lets you write simple, intuitive code that feels like
        plain JavaScript, while delivering the performance and reliability you expect, without sacrificing immutability
        and predictability.
      </SectionDescription>

      <MainCTA className="md:mb-6" href={'/docs/react/getting-started'} />

      <div className={'grid grid-cols-1 md:grid-cols-2 items-stretch gap-4 md:gap-8 w-full mb-4 md:mb-10'}>
        <Card className={'flex-1 md:shadow-2xl bg-code-block-background'}>
          <CodeViewer className={'flex-1 flex flex-col'} minHeight={320} maxHeight={320} items={[anchorBlock]} />
        </Card>
        <Card className={'flex-1 md:shadow-2xl bg-code-block-background'}>
          <CodeViewer className={'flex-1 flex flex-col'} minHeight={320} maxHeight={320} items={otherBlocks} />
        </Card>
      </div>
    </Section>
  );
}
