'use client';

import type { EFC } from '@anchorlib/react-kit';
import { Card, CardContent, CodeViewer } from '@anchorlib/react-kit/components';
import { classx } from '@anchorlib/react-kit/utils';
import type { HTMLAttributes } from 'react';

const sharedCode = `
import { mutable } from '@anchorlib/react';

// Declare your shared state.
export const settings = mutable({
  theme: 'light',
  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
  }
});

`;

const codeBlocks = [
  {
    name: 'React',
    icon: '/images/logos/react.svg',
    iconAlt: 'React Logo',
    lang: 'tsx',
    code: `
import { template } from '@anchorlib/react';
import { settings } from '../lib/state.ts';

export const App = template(() => (
  <>
    <div>{settings.theme}</div>
    <button onClick={() => settings.toggleTheme()}>Toggle</button>
  </>
), 'App');
`,
  },
  {
    name: 'Solid',
    icon: '/images/logos/solid.svg',
    iconAlt: 'SolidJS Logo',
    lang: 'tsx',
    code: `
import '@anchorlib/solid/reactive';
import { settings } from '../lib/state.ts';

const App = () => (
  <>
    <div>{settings.theme}</div>
    <button onClick={() => settings.toggleTheme()}>Toggle</button>
  </>
);
`,
  },
  {
    name: 'Svelte',
    icon: '/images/logos/svelte.svg',
    iconAlt: 'Svelte Logo',
    lang: 'svelte',
    code: `
<script lang="ts">
  import '@anchorlib/svelte/reactive';
  import { settings } from '../lib/state.ts';
</script>

<div>{settings.theme}</div>
<button onclick={() => settings.toggleTheme()}>Toggle</button>
`,
  },
  {
    name: 'Vue',
    icon: '/images/logos/vue.svg',
    iconAlt: 'Vue Logo',
    lang: 'vue',
    code: `
<script lang="ts">
  import { observedRef } from '@anchorlib/vue';
  import { settings } from '../lib/state.ts';

  const theme = observedRef(() => settings.theme);
</script>

<template>
  <div>{{ theme }}</div>
  <button @click="settings.toggleTheme">Toggle</button>
</template>
`,
  },
  {
    name: 'Vanilla',
    icon: '/images/logos/html.svg',
    iconAlt: 'HTML Logo',
    lang: 'html',
    code: `
<script type="module">
  import { subscribe } from '@anchorlib/core';
  import { settings } from '../lib/state.ts';

  subscribe(settings, () => {
    document.body.className = settings.theme;
  });

  document
  .querySelector('button')
  .addEventListener('click', () => settings.toggleTheme());
</script>
`,
  },
];

export const StateSharing: EFC<HTMLAttributes<HTMLDivElement>, HTMLDivElement> = ({ className }) => {
  return (
    <div className={classx('grid grid-cols-1 md:grid-cols-2 items-stretch gap-4 md:gap-8 w-full', className)}>
      <Card className={'col-span-2 md:col-span-1 md:shadow-2xl'}>
        <CardContent className={'flex flex-col flex-1 bg-code-block-background md:h-[284px]'}>
          <CodeViewer
            className={'flex-1 flex flex-col'}
            minHeight={248}
            maxHeight={248}
            items={[
              {
                name: 'lib/state.ts',
                icon: '/anchor-logo.svg',
                iconAlt: 'Anchor Logo',
                code: sharedCode,
              },
            ]}
          />
        </CardContent>
      </Card>
      <Card className={'col-span-2 md:col-span-1 md:shadow-2xl'}>
        <CardContent className={'flex-1 bg-code-block-background md:h-[284px]'}>
          <CodeViewer items={codeBlocks} minHeight={248} maxHeight={248} />
        </CardContent>
      </Card>
    </div>
  );
};
