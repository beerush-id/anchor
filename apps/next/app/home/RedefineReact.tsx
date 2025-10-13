'use client';

import { Card, CodeViewer, Section, SectionDescription, SectionTitle } from '@anchorlib/react-kit/components';
import { MainCTA } from '@components/MainCTA';

const anchorCode = `
import { setup, view, useAnchor } from '@anchorlib/react';
import { createContext, useContext } from 'react';

const TabContext = createContext(null);

export const TabButton = setup(({ name, children, ...props }) => {
  const tab = useContext(TabContext);

  if (tab && !tab.active) tab.select(name);

  const Template = view(() => (
    <button
      onClick={() => tab?.select(name)}
      disabled={tab?.disabled}
      className={tab?.active === name ? 'active' : ''}
      {...props}>
      {children}
    </button>
   ));

  return <Template />;
});

const createTab = (options) => useAnchor({
  active: options?.active ?? null,
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

  useEffect(() => {
    if (tab && tab.active === null) {
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
      className={tab?.active === name ? 'active' : ''}
      {...props}>
      {children}
    </button>
  );
};

const createTab = (options) => {
  const [active, setActive] = useState(options?.active ?? null);
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
    if (tab && tab.active === null) {
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
      className={tab?.active === name ? 'active' : ''}
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
    active: options?.active ?? null,
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
    if (tab && tab.active === null) {
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
      className={tab?.active === name ? 'active' : ''}
      {...props}>
      {children}
    </button>
  );
});

class TabStore {
  active = null;
  disabled = false;
  
  constructor(options) {
    this.active = options?.active ?? null;
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
    if (tab.active === null) {
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
      className={tab?.active === name ? 'active' : ''}
      {...props}>
      {children}
    </button>
  );
};

const createTab = (options) => {
  const tabAtoms = {
    active: atom(options?.active ?? null),
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
    if (tab && tab.active === null) {
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
      className={tab?.active === name ? 'active' : ''}
      {...props}>
      {children}
    </button>
  );
};

const createTab = (options) => {
  return createTabStore(options);
};

const createTabStore = (options) => create((set, get) => ({
  active: options?.active ?? null,
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
      <SectionTitle className={'text-center'}>Redefine React Components</SectionTitle>
      <SectionDescription className={'md:mb-6 text-center'}>
        Anchor separates component initialization from rendering, creating cleaner components that eliminate boilerplate
        state management code, prevent unnecessary re-renders, and provide stable references. A fresh approach to React
        component architecture.
      </SectionDescription>

      <div className={'grid grid-cols-1 md:grid-cols-2 items-stretch gap-4 md:gap-8 w-full mb-4 mb-4 md:mb-10'}>
        <Card className={'flex-1'}>
          <CodeViewer className={'flex-1 flex flex-col'} minHeight={380} maxHeight={380} items={[anchorBlock]} />
        </Card>
        <Card className={'flex-1'}>
          <CodeViewer className={'flex-1 flex flex-col'} minHeight={380} maxHeight={380} items={otherBlocks} />
        </Card>
      </div>

      <MainCTA className="md:mb-6" href={'/docs/react/getting-started'} />
    </Section>
  );
}
