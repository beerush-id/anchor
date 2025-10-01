'use client';

import { Card, CodeViewer, Section, SectionTitle } from '@anchorlib/react-kit/components';
import ReactSnippet from './React?raw';
import SolidSnippet from './Solid?raw';
import SvelteSnippet from './Svelte.svelte?raw';
import VueSnippet from './Vue.vue?raw';

const snippets = [
  {
    name: 'React',
    lang: 'tsx',
    icon: '/images/logos/react.svg',
    iconAlt: 'React logo',
    code: ReactSnippet,
  },
  {
    name: 'Solid',
    lang: 'tsx',
    icon: '/images/logos/solid.svg',
    iconAlt: 'Solid logo',
    code: SolidSnippet,
  },
  {
    name: 'Svelte',
    lang: 'svelte',
    icon: '/images/logos/svelte.svg',
    iconAlt: 'Svelte logo',
    code: SvelteSnippet,
  },
  {
    name: 'Vue',
    lang: 'vue',
    icon: '/images/logos/vue.svg',
    iconAlt: 'Vue logo',
    code: VueSnippet,
  },
];

export default function Page() {
  return (
    <Section className={'page-section immersive-section'}>
      <SectionTitle className={'text-center text-4xl'}>
        <h2>Anchor in React, Solid, Svelte, and Vue</h2>
      </SectionTitle>
      <Card className={'w-full'}>
        <CodeViewer items={snippets} />
      </Card>
    </Section>
  );
}
