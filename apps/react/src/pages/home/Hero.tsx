import { Section } from '@components/Section.js';
import { MainCTA } from '@components/MainCTA.js';

export const Hero = () => {
  return (
    <Section id="hero" className="max-w-5xl mx-auto text-center">
      <h2 className="text-4xl md:text-6xl font-light text-white mb-6 leading-tight tracking-tighter">
        State Management for <del className="opacity-50 font-light">Developers</del> Humans, Built for{' '}
        <del className="opacity-50 font-light">Todo Apps</del> Enterprise Apps
      </h2>
      <p className="section-subtitle mb-12 text-slate-300 text-lg">
        Anchor values the AX (All eXperience) philosophy. Anchor not just makes apps work, but also efficient. Intuitive
        code makes developers happy, high performance makes users happy.
      </p>
      <MainCTA className="mt-10 mt:my-20 mb-10" />
      <blockquote className="text-slate-400 italic font-light text-lg mb-10 md:mb-20">
        "We love React because it's awesome! (until it's not)"
      </blockquote>
      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        <div className="card p-8">
          <p className="text-4xl font-light text-sky-400 mb-3">~297x Faster</p>
          <p className="text-white text-lg font-semibold">UI Render Time on Toggle Actions</p>
          <p className="text-slate-400 mt-2 text-sm">
            Anchor's optimized rendering dramatically reduces the time spent updating the user interface, leading to
            instant feedback.
          </p>
        </div>
        <div className="card p-8">
          <p className="text-4xl font-light text-sky-400 mb-3">~10.8x Higher</p>
          <p className="text-white text-lg font-semibold">Frame Rate During UI Updates</p>
          <p className="text-slate-400 mt-2 text-sm">
            Experience buttery-smooth interactions as Anchor maintains a consistently high frame rate, even during
            complex operations.
          </p>
        </div>
      </div>
    </Section>
  );
};
