'use client';

import { Section, SectionDescription, SectionTitle } from '@anchorlib/react-kit/components';
import { MainCTA } from '@components/MainCTA';
import { StateSharing } from './StateSharing';

export const FrameworkAgnostic = () => {
  return (
    <Section className={['page-section', 'fill-screen-section']}>
      <SectionTitle className={'text-center'}>Declare Your State Once, Use It Everywhere</SectionTitle>
      <SectionDescription className="md:mb-6 text-center">
        Anchor lets you define state in one place and share it across React, Vue, Svelte, and even VanillaJS — with
        fine-grained reactivity, true-immutability, and data integrity built in, backed with superior performance.
      </SectionDescription>

      <StateSharing className={'mb-4 md:mb-10'} />
      <MainCTA className="mb-6" />
    </Section>
  );
};
