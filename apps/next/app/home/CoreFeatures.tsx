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
    name: 'App.tsx',
    icon: '/images/logos/react.svg',
    iconAlt: 'React Logo',
    lang: 'tsx',
    code: `
import { useAnchor, observe } from '@anchorlib/react';

const App = () => {
  const [profile] = useAnchor({
    name: 'John Doe', 
    email: 'johndoe@example.com' 
  });

  // Only this part re-renders when the state changes.
  const Profile = observe(() => (
    <div>
      <h1>{profile.name}</h1>
      <p>{profile.email}</p>
    </div>
  ));
  
  // Stable reference, no need useCallback.
  const changeName = () => {
    profile.name = 'Jane Smith';
  }
  
  // This part only rendered once.
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
    name: 'App.svelte',
    icon: '/images/logos/svelte.svg',
    iconAlt: 'Svelte Logo',
    lang: 'svelte',
    code: `
<script lang="ts">
  import { anchorRef } from '@anchorlib/svelte'; 

  const profile = anchorRef({
    name: 'John Doe', 
    email: 'johndoe@example.com' 
  });
  
  const changeName = () => {
    $profile.name = 'Jane Smith';
  };
</script>

<div>
  <h1>{$profile.name}</h1>
  <p>{$profile.email}</p>
</div>

<button onclick={changeName}>Change Name</button>
    `,
  },
  {
    name: 'App.vue',
    icon: '/images/logos/vue.svg',
    iconAlt: 'Vue Logo',
    lang: 'vue',
    code: `
<script setup lang="ts">
  import { anchorRef } from '@anchorlib/vue';

  const profile = anchorRef({
    name: 'John Doe', 
    email: 'johndoe@example.com' 
  });
  
  const changeName = () => {
    profile.value.name = 'Jane Smith';
  };
</script>

<div>
  <h1>{{ profile.name }}</h1>
  <p>{{ profile.email }}</p>
</div>

<button @click="changeName">Change Name</button>
`,
  },
];

const trueImmutabilityCodes = [
  {
    name: 'App.tsx',
    icon: '/images/logos/react.svg',
    iconAlt: 'React Logo',
    lang: 'tsx',
    code: `
import { useImmutable, useWriter } from '@anchorlib/react';

const App = () => {
  const [profile] = useImmutable({
    name: 'John Doe', 
    email: 'johndoe@example.com' 
  });
  const writer = useWriter(profile, ['name'])
  
  const changeName = () => {
    // Expected and allowed mutation.
    writer.name = 'Jane Smith';

    // Unexpected mutation will never reach the state.
    // This mutation will be caught and warned at the IDE level,
    // build time, and runtime due to immutability.
    writer.email = 'johndoe@example.com';
  }
  
  return <button onClick={changeName}>Change Name</button>;
};
`,
  },
  {
    name: 'App.svelte',
    icon: '/images/logos/svelte.svg',
    iconAlt: 'Svelte Logo',
    lang: 'svelte',
    code: `
<script lang="ts">
  import { immutableRef, writableRef } from '@anchorlib/svelte';

  const profile = immutableRef({
    name: 'John Doe', 
    email: 'johndoe@example.com' 
  });
  const writer = writableRef($profile, ['name']);
  
  const changeName = () => {
    // Expected and allowed mutation.
    $writer.name = 'Jane Smith';

    // Unexpected mutation will never reach the state.
    // This mutation will be caught and warned at the IDE level,
    // build time, and runtime due to immutability.
    $writer.email = 'johndoe@example.com';
  }
</script>

<button onclick={changeName}>Change Name</button>
    `,
  },
  {
    name: 'App.vue',
    icon: '/images/logos/vue.svg',
    iconAlt: 'Vue Logo',
    lang: 'vue',
    code: `
<script setup lang="ts">
  import { immutableRef, writableRef } from '@anchorlib/vue';

  const profile = immutableRef({
    name: 'John Doe', 
    email: 'johndoe@example.com' 
  });
  const writer = writableRef(profile.value, ['name']);
  
  const changeName = () => {
    // Expected and allowed mutation.
    writer.value.name = 'Jane Smith';

    // Unexpected mutation will never reach the state.
    // This mutation will be caught and warned at the IDE level,
    // build time, and runtime due to immutability.
    writer.value.email = 'johndoe@example.com';
  };
</script>

<button @click="changeName">Change Name</button>
`,
  },
];

const integrityCodes = [
  {
    name: 'App.tsx',
    icon: '/images/logos/react.svg',
    iconAlt: 'React Logo',
    lang: 'tsx',
    code: `
import { z } from 'zod/v4';
import { useModel } from '@anchorlib/react';

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Invalid email format")
});
  
const App = () => {
  const [profile] = useModel(schema, {
    name: 'John Doe', 
    email: 'johndoe@example.com' 
  });
  
  const changeName = () => {
    // Valid mutation.
    profile.name = 'Jane Smith';

    // Invalid mutation will never reach the state.
    profile.email = 10;
  }
  
  return <button onClick={changeName}>Change Name</button>;
};
`,
  },
  {
    name: 'App.svelte',
    icon: '/images/logos/svelte.svg',
    iconAlt: 'Svelte Logo',
    lang: 'svelte',
    code: `
<script lang="ts">
  import { z } from 'zod/v4';
  import { modelRef } from '@anchorlib/svelte';

  const schema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.email("Invalid email format")
  });

  const profile = modelRef(schema, {
    name: 'John Doe', 
    email: 'johndoe@example.com' 
  });
  
  const changeName = () => {
    // Valid mutation.
    $profile.name = 'Jane Smith';

    // Invalid mutation will never reach the state.
    $profile.email = 10;
  }
</script>

<button onclick={changeName}>Change Name</button>
    `,
  },
  {
    name: 'App.vue',
    icon: '/images/logos/vue.svg',
    iconAlt: 'Vue Logo',
    lang: 'vue',
    code: `
<script setup lang="ts">
  import { z } from 'zod/v4';
  import { modelRef } from '@anchorlib/vue';

  const schema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.email("Invalid email format")
  });

  const profile = modelRef(schema, {
    name: 'John Doe', 
    email: 'johndoe@example.com' 
  });
  
  const changeName = () => {
    // Valid mutation.
    profile.value.name = 'Jane Smith';

    // Invalid mutation will never reach the state.
    profile.value.email = 10;
  }
</script>

<button @click="changeName">Change Name</button>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-12">
        <Card>
          <CodeViewer items={fineGrainedCodes} className={'tight-code-viewer'} />
        </Card>
        <div className="flex flex-col gap-6 justify-center">
          <SectionSubtitle>Fine-Grained Reactivity — Built for Performance and Efficiency</SectionSubtitle>
          <p className="mb-4 text-slate-700 dark:text-slate-300">
            Anchor delivers unmatched performance with its fine-grained reactivity system, enabling efficient updates
            and blazing-fast rendering that keeps your application responsive under any workload.
          </p>

          <MainCTA className={'justify-start w-full'} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-12">
        <div className="flex flex-col gap-6 justify-center">
          <SectionSubtitle>True-Immutability — Built for Readability, Maintainability, and Scalability</SectionSubtitle>
          <p className="mb-4 text-slate-700 dark:text-slate-300">
            With Anchor's true immutability guarantees, state changes are explicit and predictable. This design
            eliminates entire classes of bugs related to unexpected mutations while making your code easier to reason
            about, test, and refactor as your application grows in complexity.
          </p>

          <MainCTA className={'justify-start w-full'} />
        </div>
        <Card>
          <CodeViewer items={trueImmutabilityCodes} className={'tight-code-viewer'} />
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-12">
        <Card>
          <CodeViewer items={integrityCodes} className={'tight-code-viewer'} />
        </Card>
        <div className="flex flex-col gap-6 justify-center">
          <SectionSubtitle>Data Integrity — Built for Reliability, and Safety</SectionSubtitle>
          <p className="mb-4 text-slate-700 dark:text-slate-300">
            Anchor ensures data integrity through Zod schema validation, providing strong type safety and runtime
            validation. This prevents invalid data from entering your application state, ensuring reliability and safety
            across all components.
          </p>

          <MainCTA className={'justify-start w-full'} />
        </div>
      </div>
    </div>
  </Section>
);
