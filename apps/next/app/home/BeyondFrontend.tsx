'use client';

import { Card, CodeViewer, Section, SectionDescription, SectionTitle } from '@anchorlib/react-kit/components';
import StreamRouteCode from '../apis/stream/route?raw';
import StreamViewCode from '@components/chats/HelloChat?raw';
import { HelloChat } from '@components/chats/HelloChat';

const codeBlocks = [
  {
    name: 'App.tsx',
    lang: 'tsx',
    icon: '/images/logos/react.svg',
    iconAlt: 'React Logo',
    code: StreamViewCode,
  },
  {
    name: 'route.ts',
    lang: 'ts',
    icon: '/images/logos/typescript.svg',
    iconAlt: 'Typescript Logo',
    code: StreamRouteCode,
  },
];

export function BeyondFrontend() {
  return (
    <Section className="page-section">
      <SectionTitle className={'text-center'}>Beyond Frontend: Write Once, Use Everywhere</SectionTitle>
      <SectionDescription className={'text-center md:mb-12'}>
        Anchor truly lives up to its "write once, use everywhere" promise. The same reactive patterns and state
        management work seamlessly on both frontend and backend.
      </SectionDescription>

      <div className="grid grid-cols-1 md:grid-cols-12 w-full gap-4 md:gap-6">
        <Card className={'flex-1 md:col-span-7 md:shadow-2xl bg-code-block-background'}>
          <CodeViewer items={codeBlocks} maxHeight={360} />
        </Card>
        <Card className={'flex-1 md:col-span-5 md:shadow-2xl bg-code-block-background'}>
          <HelloChat />
        </Card>
      </div>

      <p className="text-center text-slate-600 dark:text-slate-300 my-4 max-w-2xl mx-auto">
        Experience how Anchor eliminates the traditional boundaries between client and server code with the same APIs
        and mental model across environments.
      </p>
    </Section>
  );
}
