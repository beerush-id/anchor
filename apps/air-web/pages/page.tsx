import { Head, page, uIndex } from '@airlib/react';
import { CODE_GROUP_INDEX } from '@airlib/react/mdx';
import { Features } from '../components/Features.js';
import { Advanced } from '../components/features/Advanced.js';
import { BeyondUi } from '../components/features/BeyondUi.js';
import { FineGrained } from '../components/features/FineGrained.js';
import { Irpc } from '../components/features/Irpc.js';
import { Router } from '../components/features/Router.js';
import { Runtime } from '../components/features/Runtime.js';
import { UniversalSsr } from '../components/features/UniversalSsr.js';
import { Workflow } from '../components/features/Workflow.js';
import { Hero } from '../components/Hero.js';
import { rootIndexRoute } from './route.ts';

export default page(rootIndexRoute).render(() => {
  void uIndex(CODE_GROUP_INDEX, true);

  return (
    <>
      <Head
        meta={{
          title: 'AirLib — Fine-Grained Reactivity & Isomorphic RPC',
          description:
            'A modern, fine-grained reactive web framework with isomorphic RPC, instant edge streaming, and unified state management across React, Solid, Svelte, and Vue.',
          keywords: [
            'AirLib',
            'reactive framework',
            'fine-grained reactivity',
            'isomorphic RPC',
            'IRPC',
            'edge streaming',
            'state management',
            'reactive stores',
          ],
          og: {
            title: 'AirLib — Fine-Grained Reactivity & Isomorphic RPC',
            description:
              'A modern, fine-grained reactive web framework with isomorphic RPC, instant edge streaming, and unified state management.',
            type: 'website',
            siteName: 'AirLib',
          },
          twitter: {
            card: 'summary_large_image',
            title: 'AirLib — Fine-Grained Reactivity & Isomorphic RPC',
            description:
              'A modern, fine-grained reactive web framework with isomorphic RPC, instant edge streaming, and unified state management.',
          },
        }}
      />
      <Hero />
      <Features />
      <FineGrained />
      <Irpc />
      <BeyondUi />
      <Router />
      <UniversalSsr />
      <Workflow />
      <Runtime />
      <Advanced />
    </>
  );
});
