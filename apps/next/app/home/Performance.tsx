'use client';
import { Section, SectionDescription, SectionTitle } from '@anchorlib/react-kit/components';
import { MainCTA } from '@components/MainCTA';
import classicBench from './classic.report.json';
import anchorBench from './anchor.report.json';
import { BenchmarkCompare } from '@components/stats/BenchmarkReport';

export function Performance() {
  return (
    <Section id="performance" className={['page-section', 'fill-screen-section']}>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-12">
        <div className="md:col-span-6 flex flex-col gap-4 justify-center">
          <SectionTitle className={'text-center md:text-left'}>
            State Management for Humans, Built for Enterprise Scale
          </SectionTitle>
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
          <MainCTA className={'md:justify-start w-full'} />
        </div>
        <div className="md:col-span-6 flex flex-col gap-4 md:gap-6 text-center">
          <BenchmarkCompare className={'flex-1'} anchor={anchorBench} classic={classicBench} />
        </div>
      </div>
    </Section>
  );
}
