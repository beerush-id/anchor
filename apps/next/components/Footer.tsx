import { Section, SectionDescription, SectionTitle } from '@anchorlib/react-kit/components';
import { MainCTA } from '@components/MainCTA';
import Image from 'next/image.js';

export function Footer() {
  return (
    <>
      <Section>
        <SectionTitle>Ready to Anchor Your State?</SectionTitle>
        <SectionDescription>
          Get started in seconds. Install the package and simplify your app today.
        </SectionDescription>
        <div className="w-full my-4 md:my-8">
          <MainCTA tiys={false}>
            <a
              href="https://www.producthunt.com/products/anchor-6?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-anchor&#0045;11"
              target="_blank"
              className="inline-flex">
              <Image
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1015951&theme=dark&t=1757806815737"
                alt="Anchor - State&#0032;Management&#0032;For&#0032;Humans&#0044;&#0032;Built&#0032;for&#0032;Enterprise&#0032;Apps | Product Hunt"
                width="250"
                height="54"
              />
            </a>
          </MainCTA>
        </div>
      </Section>

      <footer className="text-center py-8 text-sm">
        <p className="flex flex-col px-4">
          <span>© {new Date().getFullYear()} Anchor. All rights reserved.&nbsp;</span>
        </p>
        <p className="flex items-center justify-center">
          <span>Built with ❤️ by&nbsp;</span>
          <a
            href="https://www.mahdaen.name"
            target="_blank"
            className="font-medium hover:text-brand-main dark:hover:text-brand-orange transition-colors">
            Nanang Mahdaen El Agung
          </a>
        </p>
      </footer>
    </>
  );
}
