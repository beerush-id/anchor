import { Head, page, uIndex } from '@airlib/react';
import { CODE_GROUP_INDEX } from '@airlib/react/mdx';
import { BuiltForScale } from '@/components/BuiltForScale.js';
import { Features } from '@/components/Features.js';
import { FreedomOfChoice } from '@/components/FreedomOfChoice.js';
import { Advanced } from '@/components/features/Advanced.js';
import { BeyondUi } from '@/components/features/BeyondUi.js';
import { FineGrained } from '@/components/features/FineGrained.js';
import { Irpc } from '@/components/features/Irpc.js';
import { Router } from '@/components/features/Router.js';
import { Runtime } from '@/components/features/Runtime.js';
import { UniversalSsr } from '@/components/features/UniversalSsr.js';
import { Workflow } from '@/components/features/Workflow.js';
import { Hero } from '@/components/Hero.js';
import { rootIndexRoute } from './route.ts';

export default page(rootIndexRoute).render(() => {
  void uIndex(CODE_GROUP_INDEX, true);

  return (
    <>
      <Head
        meta={{
          title: 'Fine-Grained Reactivity & Isomorphic Full-Stack Framework for React & SolidJS',
          description:
            'Bring true fine-grained reactivity and isomorphic RPC to React and SolidJS. Eliminate memoization hell, skip API boilerplate, and ship ultra-fast universal SSR with zero lock-in.',
          keywords: [
            'React Signals',
            'SolidJS Full Stack',
            'Fine-Grained Reactivity',
            'Isomorphic RPC',
            'React Full-Stack Framework',
            'SolidJS Framework',
            'End-to-End Type Safety',
            'Universal SSR',
            'Zero-JS Static Delivery',
            'Next.js Alternative',
            'SolidStart Alternative',
            'AirLib',
          ],
        }}
      />
      <Hero />
      <Features />
      <FineGrained />
      <Irpc />
      <BeyondUi />
      <BuiltForScale />
      <Router />
      <UniversalSsr />
      <Workflow />
      <Runtime />
      <Advanced />
      <FreedomOfChoice />
    </>
  );
});
