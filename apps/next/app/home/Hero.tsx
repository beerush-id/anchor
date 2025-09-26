'use client';

import { Section } from '@anchorlib/react-kit/components';
import { MainCTA } from '@components/MainCTA';

export const Hero = () => {
  return (
    <Section id="hero" className={['page-section', 'text-center', 'px-4', 'min-h-screen']}>
      <h2 className="text-4xl md:text-6xl font-light text-black dark:text-white mb-6 leading-tight tracking-tighter">
        State Management for <del className="opacity-50 font-light">Developers</del> Humans, Built for{' '}
        <del className="opacity-50 font-light">Todo Apps</del> Enterprise Apps
      </h2>
      <p className="section-subtitle mb-12 text-slate-700 dark:text-slate-300 text-lg">
        Anchor values the AX (All eXperience) philosophy. Anchor not just makes apps work, but also efficient. Intuitive
        code makes developers happy, high performance makes users happy.
      </p>
      <MainCTA className="mt-10 mt:my-20 mb-10" />
      <blockquote className="text-slate-500 dark:text-slate-400 italic font-light text-lg mb-10 md:mb-20">
        "We love React because it's awesome! (until it's not)"
      </blockquote>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        <div className="ark-card p-8">
          <p className="text-4xl font-light text-sky-400 mb-3">~297x Faster</p>
          <p className="text-slate-700 dark:text-white text-lg font-semibold">UI Render Time on Toggle Actions</p>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
            Anchor's optimized rendering dramatically reduces the time spent updating the user interface, leading to
            instant feedback.
          </p>
        </div>
        <div className="ark-card p-8">
          <p className="text-4xl font-light text-sky-400 mb-3">~10.8x Higher</p>
          <p className="text-slate-700 dark:text-white text-lg font-semibold">Frame Rate During UI Updates</p>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
            Experience buttery-smooth interactions as Anchor maintains a consistently high frame rate, even during
            complex operations.
          </p>
        </div>
      </div>
    </Section>
  );
};
