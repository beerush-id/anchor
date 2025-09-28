import { Section, SectionDescription, SectionTitle } from '@anchorlib/react-kit/components';
import { MainCTA } from '@components/MainCTA';

export function About() {
  return (
    <Section id="overview" className={['page-section', 'fill-screen-section']}>
      <div className="grid md:grid-cols-12 gap-4 md:gap-12">
        <div className="col-span-7 flex flex-col gap-4 justify-center">
          <SectionTitle>State Management for Humans, Built for Enterprise Scale</SectionTitle>
          <SectionDescription className={'text-base'}>
            Anchor is built on the AX (All eXperience) philosophy - prioritizing both developer and user experience. We
            believe intuitive code shouldn't compromise performance, making developers productive while ensuring users
            get instant, responsive interfaces.
          </SectionDescription>
          <SectionDescription className={'mb-6 text-base'}>
            From simple prototypes to complex enterprise applications, Anchor scales efficiently with your needs. Handle
            massive datasets, intricate business logic, and high-frequency updates without sacrificing performance or
            developer experience.
          </SectionDescription>
          <MainCTA className={'justify-start w-full'} />
        </div>
        <div className="col-span-5 flex flex-col gap-4 md:gap-6 text-center">
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
      </div>
    </Section>
  );
}
