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
import { LayoutTemplate, Scaling, SquareFunction } from 'lucide-react';

const anchorCode = `
import { setup, view, useAnchor } from '@anchorlib/react-classic';
import { createContext, useContext } from 'react';

const TabContext = createContext(null);

export const TabButton = setup(({ name, children, ...props }) => { // [!code ++]
  const tab = useContext(TabContext);

  if (tab && !tab.value) tab.select(name); // [!code ++]

  const Template = view(() => ( // [!code ++]
    <button
      onClick={() => tab?.select(name)}
      disabled={tab?.disabled}
      className={tab?.value === name ? 'active' : ''}
      {...props}>
      {children}
    </button>
   ));

  return <Template />;
});

const createTab = (options) => useAnchor({
  active: options?.value ?? null,
  disabled: options?.disabled ?? false,
  select(name) {
    if (this.disabled) return;
    this.active = name;
  }
});
`.trim();

const reactCode = `
import { useState, useEffect, createContext, useContext } from 'react';

const TabContext = createContext(null);

export const TabButton = ({ name, children, ...props }) => {
  const tab = useContext(TabContext);

  // The tricky and scary part. Wrong dependency can cause infinite loops
  // leading to DDOS-ing ourselves - a true story.
  useEffect(() => { // [!code --]
    if (tab && !tab.value) { // [!code --]
      tab.select(name); // [!code --]
    } // [!code --]
  }, [tab, name]); // [!code --]

  const handleClick = () => {
    tab?.select(name);
  };

  return (
    <button
      onClick={handleClick}
      disabled={tab?.disabled}
      className={tab?.value === name ? 'active' : ''}
      {...props}>
      {children}
    </button>
  );
};

const createTab = (options) => {
  const [active, setActive] = useState(options?.value ?? null);
  const [disabled, setDisabled] = useState(options?.disabled ?? false);

  return {
    active,
    disabled,
    setActive,
    setDisabled,
    select(name) {
      if (this.disabled) return;
      setActive(name);
    }
  };
};
`.trim();

const reduxCode = `
import { createContext, useContext, useReducer } from 'react';

const TabContext = createContext(null);

export const TabButton = ({ name, children, ...props }) => {
  const tab = useContext(TabContext);

  useEffect(() => {
    if (tab && tab.value === null) {
      tab.select(name);
    }
  }, [tab, name]);

  const handleClick = () => {
    tab?.select(name);
  };

  return (
    <button
      onClick={handleClick}
      disabled={tab?.disabled}
      className={tab?.value === name ? 'active' : ''}
      {...props}>
      {children}
    </button>
  );
};

const initialState = { active: null, disabled: false };
const tabReducer = (state, action) => {
  switch (action.type) {
    case 'SELECT_TAB':
      return { ...state, active: action.payload };
    case 'SET_DISABLED':
      return { ...state, disabled: action.payload };
    default:
      return state;
  }
};

const createTab = (options) => {
  const [state, dispatch] = useReducer(tabReducer, {
    active: options?.value ?? null,
    disabled: options?.disabled ?? false
  });
  return {
    active: state.active,
    disabled: state.disabled,
    select: (name) => {
      if (state.disabled) return;
      dispatch({ type: 'SELECT_TAB', payload: name });
    },
    setDisabled: (disabled) => dispatch({ type: 'SET_DISABLED', payload: disabled })
  };
};
`.trim();

const mobxCode = `
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect, useContext } from 'react';

const TabContext = createContext(null);

export const TabButton = observer(({ name, children, ...props }) => {
  const tab = useContext(TabContext);

  useEffect(() => {
    if (tab && tab.value === null) {
      tab.select(name);
    }
  }, [tab, name]);

  const handleClick = () => {
    tab?.select(name);
  };

  return (
    <button
      onClick={handleClick}
      disabled={tab?.disabled}
      className={tab?.value === name ? 'active' : ''}
      {...props}>
      {children}
    </button>
  );
});

class TabStore {
  active = null;
  disabled = false;

  constructor(options) {
    this.active = options?.value ?? null;
    this.disabled = options?.disabled ?? false;
    makeAutoObservable(this);
  }

  select(name) {
    if (this.disabled) return;
    this.active = name;
  }
}

const createTab = (options) => new TabStore(options);
`.trim();

const jotaiCode = `
import { useEffect, useContext } from 'react';
import { atom, useAtomValue, useSetAtom } from 'jotai';

const TabContext = createContext(null);

export const TabButton = ({ name, children, ...props }) => {
  const tabAtom = useContext(TabContext);
  const tab = useAtomValue(tabAtom);
  const setTab = useSetAtom(tabAtom);

  useEffect(() => {
    if (tab.value === null) {
      setTab(prev => {
        const newTab = { ...prev };
        newTab.select(name);
        return newTab;
      });
    }
  }, [tab, name, setTab]);

  const handleClick = () => {
    setTab(prev => {
      const newTab = { ...prev };
      newTab.select(name);
      return newTab;
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={tab?.disabled}
      className={tab?.value === name ? 'active' : ''}
      {...props}>
      {children}
    </button>
  );
};

const createTab = (options) => {
  const tabAtoms = {
    active: atom(options?.value ?? null),
    disabled: atom(options?.disabled ?? false),
  };

  tabAtoms.isActive = atom((get) => get(tabAtoms.active) === name);

  tabAtoms.select = atom(
    null,
    (get, set, name) => {
      if (get(tabAtoms.disabled)) return;
      set(tabAtoms.active, name);
    }
  );

  return tabAtoms;
};
`.trim();

const zustandCode = `
import { useEffect, useContext } from 'react';
import { create, useStore } from 'zustand';

const TabContext = createContext(null);

export const TabButton = ({ name, children, ...props }) => {
  const tabStore = useContext(TabContext);
  const tab = useStore(tabStore, state => state);

  useEffect(() => {
    if (tab && tab.value === null) {
      tab.select(name);
    }
  }, [tab, name]);

  const handleClick = () => {
    tab?.select(name);
  };

  return (
    <button
      onClick={handleClick}
      disabled={tab?.disabled}
      className={tab?.value === name ? 'active' : ''}
      {...props}>
      {children}
    </button>
  );
};

const createTab = (options) => {
  return createTabStore(options);
};

const createTabStore = (options) => create((set, get) => ({
  active: options?.value ?? null,
  disabled: options?.disabled ?? false,
  select: (name) => {
    if (get().disabled) return;
    set({ active: name });
  },
  setDisabled: (disabled) => set({ disabled })
}));
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
    <Section id="redefine-react" className="page-section">
      <SectionTitle className={'text-center'}>Redefine React Component</SectionTitle>
      <SectionDescription className={'md:mb-6 text-center'}>
        Tired of useEffect dependency arrays, useCallback, and useMemo? Anchor redefines the React component. By
        separating the one-time setup from the reactive view, it eliminates an entire class of boilerplate, prevents
        unnecessary re-renders, and provides stable references. It's a fresh, more reasonable approach to React
        architecture that delivers truly fine-grained performance by default.{' '}
      </SectionDescription>

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
