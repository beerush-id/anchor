'use client';

import { Section } from '@anchorlib/react-kit/components';
import { ReactImmutable } from './ReactImmutable';
import { AnchorImmutable } from './AnchorImmutable';

export default function Page() {
  return (
    <Section>
      <div className="w-full grid grid-cols-2 gap-4">
        <ReactImmutable />
        <AnchorImmutable />
      </div>
    </Section>
  );
}
