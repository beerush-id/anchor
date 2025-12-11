'use client';

import {
  Card,
  CardContent,
  CodeViewer,
  Section,
  SectionDescription,
  SectionSubtitle,
  SectionTitle,
} from '@anchorlib/react-kit/components';
import { MainCTA } from '@components/MainCTA';
import { LayoutTemplate, Scaling, SquareFunction } from 'lucide-react';

const anchorCode = `
import { setup, render } from '@anchorlib/react';

// Controlled input, two-way data binding.
export const TextInput = setup((props) => { // [!code ++]
  const handleChange = (e) => {
    props.value = e.target.value; // [!code ++]
  }

  return render(() => (
    <input 
      type="text" 
      value={props.value ?? ''}  // [!code ++]
      onChange={handleChange} />
  ));
});
`.trim();

const reactCode = `
import { useState } from 'react';

export const TextInput = ({ value, onChange, ...props }) => {
  const [internalValue, setInternalValue] = useState(value ?? '');

  const handleChange = (e) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange?.(newValue);
  };

  return (
    <input 
      type="text" 
      value={value ?? internalValue} 
      onChange={handleChange} />
  );
};
`.trim();

const reduxCode = `
import { createStore } from 'redux';
import { useDispatch, useSelector } from 'react-redux';

const textInputReducer = (state = { value: '' }, action) => {
  switch (action.type) {
    case 'UPDATE_VALUE':
      return { ...state, value: action.payload };
    default:
      return state;
  }
};

export const TextInput = ({ value, onChange, ...props }) => {
  const internalValue = useSelector(state => state.value);
  const dispatch = useDispatch();

  const handleChange = (e) => {
    const newValue = e.target.value;
    dispatch({ type: 'UPDATE_VALUE', payload: newValue });
    onChange?.(newValue);
  };

  return (
    <input 
      type="text" 
      value={value ?? internalValue} 
      onChange={handleChange} />
  );
};
`.trim();

const mobxCode = `
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';

class TextInputStore {
  value = '';

  constructor(initialValue) {
    this.value = initialValue ?? '';
    makeAutoObservable(this);
  }

  setValue(newValue) {
    this.value = newValue;
  }
}

const textInputStore = new TextInputStore();

export const TextInput = observer(({ value, onChange, ...props }) => {
  const handleChange = (e) => {
    const newValue = e.target.value;
    textInputStore.setValue(newValue);
    onChange?.(newValue);
  };

  return (
    <input 
      type="text" 
      value={value ?? textInputStore.value} 
      onChange={handleChange}/>
  );
});
`.trim();

const jotaiCode = `
import { atom, useAtom } from 'jotai';

const textAtom = atom('');

export const TextInput = ({ value, onChange, ...props }) => {
  const [internalValue, setInternalValue] = useAtom(textAtom);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange?.(newValue);
  };

  return (
    <input 
      type="text" 
      value={value ?? internalValue} 
      onChange={handleChange} />
  );
};
`.trim();

const zustandCode = `
import { create } from 'zustand';

const useTextInputStore = create((set) => ({
  value: '',
  setValue: (newValue) => set({ value: newValue }),
}));

export const TextInput = ({ value, onChange, ...props }) => {
  const { value: internalValue, setValue } = useTextInputStore();

  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    onChange?.(newValue);
  };

  return (
    <input 
      type="text" 
      value={value ?? internalValue} 
      onChange={handleChange} />
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
    name: 'Redux',
    lang: 'tsx',
    icon: '/images/logos/react.svg',
    iconAlt: 'React Logo',
    code: reduxCode,
  },
  {
    name: 'MobX',
    lang: 'tsx',
    icon: '/images/logos/react.svg',
    iconAlt: 'React Logo',
    code: mobxCode,
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
];

export function RedefineReact() {
  return (
    <Section id="hero" className="page-section">
      <SectionTitle className={'text-center'}>Redefine React Component</SectionTitle>
      <SectionDescription className={'md:mb-6 text-center'}>
        Tired of useEffect dependency arrays, useCallback, and useMemo? You're not alone. Anchor redefines the React
        component by separating <strong>Logic</strong> and <strong>View</strong>. This eliminates useEffect,
        useCallback, useMemo, and the entire dependency array issues. No stale closures, no unnecessary re-renders—just
        stable references and truly fine-grained performance by default.
      </SectionDescription>

      <MainCTA className="md:mb-6" href={'/docs/react/getting-started'} />

      <div className={'grid grid-cols-1 md:grid-cols-2 items-stretch gap-4 md:gap-8 w-full mb-4 mb-4 md:mb-10'}>
        <Card className={'flex-1 md:shadow-2xl bg-code-block-background'}>
          <CodeViewer className={'flex-1 flex flex-col'} minHeight={380} maxHeight={380} items={[anchorBlock]} />
        </Card>
        <Card className={'flex-1 md:shadow-2xl bg-code-block-background'}>
          <CodeViewer className={'flex-1 flex flex-col'} minHeight={380} maxHeight={380} items={otherBlocks} />
        </Card>
      </div>

      <div className={'grid grid-cols-1 md:grid-cols-3 items-stretch gap-4 md:gap-8 w-full mb-4 mb-4 md:mb-10'}>
        <Card className={'flex-1'}>
          <CardContent className={'p-4'}>
            <Scaling size={32} />
            <div className="flex flex-col gap-3 mt-4">
              <SectionSubtitle className={'text-xl font-medium'}>Scalable</SectionSubtitle>
              <p className={'text-sm text-foreground/70'}>
                <strong>Performance by Design, Not by Discipline</strong>. Anchor's fine-grained reactivity is O(1) by
                nature, meaning performance remains flat and predictable as your application grows.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className={'flex-1'}>
          <CardContent className={'p-4'}>
            <LayoutTemplate size={32} />
            <div className="flex flex-col gap-3 mt-4">
              <SectionSubtitle className={'text-xl font-medium'}>Predictable</SectionSubtitle>
              <p className={'text-sm text-foreground/70'}>
                <strong>Reason about your code with confidence</strong>. A clean separation between a setup that runs
                once and a reactive view, combined with explicit lifecycles, eliminates the guesswork.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className={'flex-1'}>
          <CardContent className={'p-4'}>
            <SquareFunction size={32} />
            <div className="flex flex-col gap-3 mt-4">
              <SectionSubtitle className={'text-xl font-medium'}>Reasonable</SectionSubtitle>
              <p className={'text-sm text-foreground/70'}>
                <strong>A Tool That Works With You, Not Against You</strong>. Architecture that respects your time. By
                embracing JavaScript's nature instead of fighting it, Anchor provides an intuitive, boilerplate-free
                experience.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}
