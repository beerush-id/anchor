import {
  Card,
  CodeViewer,
  Section,
  SectionDescription,
  SectionSubtitle,
  SectionTitle,
} from '@anchorlib/react-kit/components';
import { MainCTA } from '@components/MainCTA';

const fineGrainedCodes = [
  {
    name: 'Anchor',
    icon: '/anchor-logo.svg',
    iconAlt: 'Anchor Logo',
    lang: 'tsx',
    code: `
import { mutable, template, setup } from '@anchorlib/react';

const App = setup(() => {
  // State can be co-located with the component, similar to useState.
  const profile = mutable({
    name: 'John Doe',
    email: 'johndoe@example.com',
  });

  // Stable reference, no need useCallback.
  const changeName = () => {
    profile.name = 'Jane Smith';
  }

  // Only this part re-renders when the state changes.
  const Profile = template(() => (
    <div>
      <h1>{profile.name}</h1>
      <p>{profile.email}</p>
    </div>
  ), 'Profile');

  // This part only rendered once.
  return (
    <>
      <Profile />
      <button onClick={changeName}>Change Name</button>
    </>
  );
}, 'App');
`,
  },
  {
    name: 'React',
    icon: '/images/logos/react.svg',
    iconAlt: 'React Logo',
    lang: 'tsx',
    code: `
import { useState, useMemo, useCallback } from 'react';

const App = () => {
  // State is co-located with the component.
  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'johndoe@example.com',
  });

  // This part re-renders only when its dependencies change.
  const Profile = useMemo(() => {
    return (
      <div>
        <h1>{profile.name}</h1>
        <p>{profile.email}</p>
      </div>
    );
  }, [profile.name, profile.email]);

  // Unstable reference, need useCallback.
  const changeName = useCallback(() => {
    setProfile((p) => ({ ...p, name: 'Jane Smith' }));
  }, []);

  // This part re-rendered everytime the button is clicked.
  return (
    <>
      {Profile}
      <button onClick={changeName}>Change Name</button>
    </>
  );
};
`,
  },
  {
    name: 'Redux',
    icon: '/images/logos/react.svg',
    iconAlt: 'Redux Logo',
    lang: 'tsx',
    code: `
import { createSlice, configureStore } from '@reduxjs/toolkit';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { memo } from 'react';

// State is defined externally and connected to the component.
const profileSlice = createSlice({
  name: 'profile',
  initialState: {
    name: 'John Doe',
    email: 'johndoe@example.com',
  },
  reducers: {
    setName: (state, action) => { state.name = action.payload; },
  }
});
const store = configureStore({ reducer: { profile: profileSlice.reducer } });

// This component re-renders when the state changes.
const Profile = memo(() => {
  const profile = useSelector((state) => state.profile);
  return (
    <div>
      <h1>{profile.name}</h1>
      <p>{profile.email}</p>
    </div>
  );
});

// This component does not re-render.
const App = () => {
  const dispatch = useDispatch();
  const changeName = () => {
    dispatch(profileSlice.actions.setName('Jane Smith'));
  }

  return (
    <Provider store={store}>
      <Profile />
      <button onClick={changeName}>Change Name</button>
    </Provider>
  );
};
`,
  },
  {
    name: 'MobX',
    icon: '/images/logos/react.svg',
    iconAlt: 'MobX Logo',
    lang: 'tsx',
    code: `
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';

// State is defined externally in a class-based store.
class ProfileStore {
  name = 'John Doe';
  email = 'johndoe@example.com';

  constructor() { makeAutoObservable(this); }

  setName(name) { this.name = name; }
}
const store = new ProfileStore();

// This component re-renders when the state changes.
const Profile = observer(() => (
  <div>
    <h1>{store.name}</h1>
    <p>{store.email}</p>
  </div>
));

// This component does not re-render.
const App = () => {
  const changeName = () => {
    store.setName('Jane Smith');
  }

  return (
    <>
      <Profile />
      <button onClick={changeName}>Change Name</button>
    </>
  );
};
`,
  },
  {
    name: 'Jotai',
    icon: '/images/logos/react.svg',
    iconAlt: 'Jotai Logo',
    lang: 'tsx',
    code: `
import { atom, useAtom } from 'jotai';
import { memo } from 'react';

// State is defined externally as an atom.
const profileAtom = atom({
  name: 'John Doe',
  email: 'johndoe@example.com',
});

// This component re-renders when the state changes.
const Profile = memo(() => {
  const [profile] = useAtom(profileAtom);
  return (
    <div>
      <h1>{profile.name}</h1>
      <p>{profile.email}</p>
    </div>
  );
});

// This component does not re-render.
const App = () => {
  const [, setProfile] = useAtom(profileAtom);
  const changeName = () => {
    setProfile(p => ({ ...p, name: 'Jane Smith' }));
  }

  return (
    <>
      <Profile />
      <button onClick={changeName}>Change Name</button>
    </>
  );
};
`,
  },
  {
    name: 'Zustand',
    icon: '/images/logos/react.svg',
    iconAlt: 'Zustand Logo',
    lang: 'tsx',
    code: `
import { create } from 'zustand';
import { memo } from 'react';

// State is defined externally in a store.
const useStore = create((set) => ({
  profile: {
    name: 'John Doe',
    email: 'johndoe@example.com',
  },
  setName: (name) => set((state) => ({
    profile: { ...state.profile, name }
  })),
}));

// This component re-renders when the state changes.
const Profile = memo(() => {
  const profile = useStore((state) => state.profile);
  return (
    <div>
      <h1>{profile.name}</h1>
      <p>{profile.email}</p>
    </div>
  );
});

// This component does not re-render.
const App = () => {
  const setName = useStore((state) => state.setName);
  const changeName = () => {
    setName('Jane Smith');
  }

  return (
    <>
      <Profile />
      <button onClick={changeName}>Change Name</button>
    </>
  );
};
`,
  },
];

const trueImmutabilityCodes = [
  {
    name: 'Anchor',
    icon: '/anchor-logo.svg',
    iconAlt: 'Anchor Logo',
    lang: 'tsx',
    code: `
import { immutable, writable, setup } from '@anchorlib/react';

const App = setup(() => {
  const profile = immutable({
    name: 'John Doe',
    email: 'johndoe@example.com',
  });
  const writer = writable(profile, ['name']);

  const changeName = () => {
    // Expected and allowed mutation.
    writer.name = 'Jane Smith';

    // Unexpected mutation will never reach the state.
    // This mutation will be caught and warned at the IDE level,
    // build time, and runtime due to immutability.
    writer.email = 'johndoe@example.com';
  }

  return <button onClick={changeName}>Change Name</button>;
}, 'App');
`,
  },
  {
    name: 'React',
    icon: '/images/logos/react.svg',
    iconAlt: 'React Logo',
    lang: 'tsx',
    code: `
import { useState } from 'react';

const App = () => {
  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'johndoe@example.com',
  });

  const changeName = () => {
    // Immutability is enforced by convention, not by the library.
    // Expected and allowed mutation.
    setProfile(currentProfile => ({
      ...currentProfile,
      name: 'Jane Smith',
    }));

    // Unexpected mutation can still happen and reach the state.
    setProfile(currentProfile => ({
      ...currentProfile,
      email: 'jane.smith@example.com',
    }));
  }

  return <button onClick={changeName}>Change Name</button>;
};
`,
  },
  {
    name: 'Redux',
    icon: '/images/logos/react.svg',
    iconAlt: 'Redux Logo',
    lang: 'tsx',
    code: `
import { createSlice, configureStore } from '@reduxjs/toolkit';
import { Provider, useDispatch } from 'react-redux';

const profileSlice = createSlice({
  name: 'profile',
  initialState: {
    name: 'John Doe',
    email: 'johndoe@example.com',
  },
  reducers: {
    updateProfile: (state, action) => {
      // Mutations are allowed inside reducers
      state.name = action.payload.name || state.name;
      state.email = action.payload.email || state.email;
    },
  }
});
const store = configureStore({ reducer: { profile: profileSlice.reducer } });

const App = () => {
  const dispatch = useDispatch();

  const changeName = () => {
    // Redux Toolkit with Immer helps enforce immutability within reducers.
    // Expected and allowed mutation.
    dispatch(profileSlice.actions.updateProfile({ name: 'Jane Smith' }));

    // However, unexpected mutations can still be dispatched from components.
    dispatch(profileSlice.actions.updateProfile({ email: 'new@example.com' }));
  }

  return (
    <Provider store={store}>
      <button onClick={changeName}>Change Name</button>
    </Provider>
  );
};
`,
  },
  {
    name: 'Jotai',
    icon: '/images/logos/react.svg',
    iconAlt: 'Jotai Logo',
    lang: 'tsx',
    code: `
import { atom, useAtom } from 'jotai';

const profileAtom = atom({
  name: 'John Doe',
  email: 'johndoe@example.com',
});

const App = () => {
  const [, setProfile] = useAtom(profileAtom);

  const changeName = () => {
    // Immutability is managed by convention.
    // Expected and allowed mutation.
    setProfile(profile => ({ ...profile, name: 'Jane Smith' }));

    // Unexpected mutation can still happen.
    setProfile(profile => ({ ...profile, email: 'new@example.com' }));
  }

  return <button onClick={changeName}>Change Name</button>;
};
`,
  },
  {
    name: 'Zustand',
    icon: '/images/logos/react.svg',
    iconAlt: 'Zustand Logo',
    lang: 'tsx',
    code: `
import { create } from 'zustand';

const useStore = create((set) => ({
  profile: {
    name: 'John Doe',
    email: 'johndoe@example.com',
  },
  updateProfile: (updater) => set((state) => ({ profile: { ...state.profile, ...updater } })),
}));

const App = () => {
  const { updateProfile } = useStore();

  const changeName = () => {
    // Immutability is managed by convention.
    // Expected and allowed mutation.
    updateProfile({ name: 'Jane Smith' });

    // Unexpected mutation can still happen.
    updateProfile({ email: 'new@example.com' });
  }

  return <button onClick={changeName}>Change Name</button>;
};
`,
  },
  {
    name: 'MobX',
    icon: '/images/logos/react.svg',
    iconAlt: 'MobX Logo',
    lang: 'tsx',
    code: `
import { makeAutoObservable, action } from 'mobx';
import { observer } from 'mobx-react-lite';

class ProfileStore {
  name = 'John Doe';
  email = 'johndoe@example.com';

  constructor() { makeAutoObservable(this); }

  updateProfile(updates) {
    Object.assign(this, updates);
  }
}
const store = new ProfileStore();

const App = observer(() => {
  const changeName = () => {
    // MobX encourages direct mutation of state within actions.
    // Expected and allowed mutation.
    store.updateProfile({ name: 'Jane Smith' });

    // Unexpected mutation can still happen.
    store.updateProfile({ email: 'new@example.com' });
  }

  return <button onClick={changeName}>Change Name</button>;
});
`,
  },
];

const integrityCodes = [
  {
    name: 'Anchor',
    icon: '/anchor-logo.svg',
    iconAlt: 'Anchor Logo',
    lang: 'tsx',
    code: `
import { z } from 'zod';
import { mutable, setup } from '@anchorlib/react';

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format")
});

const App = setup(() => {
  const profile = mutable({
    name: 'John Doe',
    email: 'johndoe@example.com',
  }, { schema });

  const changeName = () => {
    // Valid mutation.
    profile.name = 'Jane Smith';

    // Invalid mutation will never reach the state.
    profile.email = 10;
  }

  return <button onClick={changeName}>Change Name</button>;
}, 'App');
`,
  },
  {
    name: 'React',
    icon: '/images/logos/react.svg',
    iconAlt: 'React Logo',
    lang: 'tsx',
    code: `
import { z } from 'zod';
import { useState } from 'react';

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format")
});

const App = () => {
  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'johndoe@example.com',
  });

  const changeName = () => {
    // Validation must be manually applied before state updates.
    // Valid mutation.
    const parsed = schema.safeParse({ ...profile, name: 'Jane Smith' });
    if (parsed.success) setProfile(parsed.data);

    // Invalid mutation will still reach the state without proper check,
    // a common source of bugs in manual validation scenarios.
    setProfile({ ...profile, email: 10 });
  }

  return <button onClick={changeName}>Change Name</button>;
};
`,
  },
  {
    name: 'Redux',
    icon: '/images/logos/react.svg',
    iconAlt: 'Redux Logo',
    lang: 'tsx',
    code: `
import { z } from 'zod';
import { createSlice, configureStore } from '@reduxjs/toolkit';
import { Provider, useDispatch } from 'react-redux';

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format")
});

const profileSlice = createSlice({
  name: 'profile',
  initialState: {
    name: 'John Doe',
    email: 'johndoe@example.com',
  },
  reducers: {
    setProfile: (state, action) => {
      const parsed = schema.safeParse(action.payload);
      if (parsed.success) {
        return parsed.data;
      }
      return state;
    },
  }
});
const store = configureStore({ reducer: { profile: profileSlice.reducer } });

const App = () => {
  const dispatch = useDispatch();

  const changeName = () => {
    // Validation is handled within the reducer.
    // Valid mutation.
    dispatch(profileSlice.actions.setProfile({ name: 'Jane Smith', email: 'johndoe@example.com' }));

    // Invalid mutation will be ignored by the reducer.
    dispatch(profileSlice.actions.setProfile({ name: 'Jane Smith', email: 10 }));
  }

  return (
    <Provider store={store}>
      <button onClick={changeName}>Change Name</button>
    </Provider>
  );
};
`,
  },
  {
    name: 'Jotai',
    icon: '/images/logos/react.svg',
    iconAlt: 'Jotai Logo',
    lang: 'tsx',
    code: `
import { z } from 'zod';
import { atom, useAtom } from 'jotai';

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format")
});

const profileAtom = atom({
  name: 'John Doe',
  email: 'johndoe@example.com',
});

const App = () => {
  const [, setProfile] = useAtom(profileAtom);

  const changeName = () => {
    // Validation must be manually applied before state updates.
    // Valid mutation.
    const parsed = schema.safeParse({ name: 'Jane Smith', email: 'johndoe@example.com' });
    if (parsed.success) setProfile(parsed.data);

    // Invalid mutation can still reach the state without proper check.
    setProfile(p => ({...p, email: 10}));
  }

  return <button onClick={changeName}>Change Name</button>;
};
`,
  },
  {
    name: 'Zustand',
    icon: '/images/logos/react.svg',
    iconAlt: 'Zustand Logo',
    lang: 'tsx',
    code: `
import { z } from 'zod';
import { create } from 'zustand';

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format")
});

const useStore = create((set) => ({
  profile: {
    name: 'John Doe',
    email: 'johndoe@example.com',
  },
  setProfile: (newProfile) => {
    const parsed = schema.safeParse(newProfile);
    if (parsed.success) {
      set({ profile: parsed.data });
    }
  },
}));

const App = () => {
  const { setProfile } = useStore();

  const changeName = () => {
    // Validation is handled within the store.
    // Valid mutation.
    setProfile({ name: 'Jane Smith', email: 'johndoe@example.com' });

    // Invalid mutation will be ignored.
    setProfile({ name: 'Jane Smith', email: 10 });
  }

  return <button onClick={changeName}>Change Name</button>;
};
`,
  },
  {
    name: 'MobX',
    icon: '/images/logos/react.svg',
    iconAlt: 'MobX Logo',
    lang: 'tsx',
    code: `
import { z } from 'zod';
import { makeAutoObservable, action } from 'mobx';
import { observer } from 'mobx-react-lite';

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format")
});

class ProfileStore {
  profile = {
    name: 'John Doe',
    email: 'johndoe@example.com',
  };

  constructor() { makeAutoObservable(this); }

  setProfile(newProfile) {
    const parsed = schema.safeParse(newProfile);
    if (parsed.success) {
      this.profile = parsed.data;
    }
  }
}
const store = new ProfileStore();

const App = observer(() => {
  const changeName = () => {
    // Validation is handled within the action.
    // Valid mutation.
    store.setProfile({ name: 'Jane Smith', email: 'johndoe@example.com' });

    // Invalid mutation will be ignored.
    store.setProfile({ name: 'Jane Smith', email: 10 });
  }

  return <button onClick={changeName}>Change Name</button>;
});
`,
  },
];

export const CoreFeatures = () => (
  <Section id="features" className={['page-section', 'px-4', 'py-8', 'md:py-16']}>
    <SectionTitle className="text-center">Core Features That Set Anchor Apart</SectionTitle>
    <SectionDescription className="text-center md:mb-12">
      Anchor revolutionizes state management with three powerful pillars: Fine-Grained Reactivity for unmatched
      performance, True Immutability for predictable state changes, and Data Integrity for reliable applications.
    </SectionDescription>
    <div className="flex flex-col gap-8 md:gap-24">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-8 md:gap-12">
        <Card className={'md:shadow-2xl bg-code-block-background md:order-2 xl:col-span-7'}>
          <CodeViewer items={fineGrainedCodes} className={'tight-code-viewer'} />
        </Card>
        <div className="flex flex-col gap-6 justify-center xl:col-span-5">
          <SectionSubtitle>Fine-Grained Reactivity — Built for Performance and Efficiency</SectionSubtitle>
          <p className="mb-4 text-slate-700 dark:text-slate-300">
            Anchor delivers unmatched performance with its fine-grained reactivity system, enabling efficient updates
            and blazing-fast rendering that keeps your application responsive under any workload.
          </p>

          <MainCTA className={'md:justify-start w-full'} tiys={false} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-8 md:gap-12">
        <Card className={'md:shadow-2xl bg-code-block-background xl:col-span-7'}>
          <CodeViewer items={trueImmutabilityCodes} className={'tight-code-viewer'} />
        </Card>
        <div className="flex flex-col gap-6 justify-center xl:col-span-5">
          <SectionSubtitle>True-Immutability — Built for Readability, Maintainability, and Scalability</SectionSubtitle>
          <p className="mb-4 text-slate-700 dark:text-slate-300">
            With Anchor's true immutability guarantees, state changes are explicit and predictable. This design
            eliminates entire classes of bugs related to unexpected mutations while making your code easier to reason
            about, test, and refactor as your application grows in complexity.
          </p>

          <MainCTA className={'md:justify-start w-full'} tiys={false} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-8 md:gap-12">
        <Card className={'md:shadow-2xl bg-code-block-background md:order-2 xl:col-span-7'}>
          <CodeViewer items={integrityCodes} className={'tight-code-viewer'} />
        </Card>
        <div className="flex flex-col gap-6 justify-center xl:col-span-5">
          <SectionSubtitle>Data Integrity — Built for Reliability, and Safety</SectionSubtitle>
          <p className="mb-4 text-slate-700 dark:text-slate-300">
            Anchor ensures data integrity through Zod schema validation, providing strong type safety and runtime
            validation. This prevents invalid data from entering your application state, ensuring reliability and safety
            across all components.
          </p>

          <MainCTA className={'md:justify-start w-full'} tiys={false} />
        </div>
      </div>
    </div>
  </Section>
);
