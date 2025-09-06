import type { FC } from 'react';
import { Card } from '../Card.js';
import { CodeBlock } from '../CodeBlock.js';
import { CardHeader } from '../CardHeader.js';
// SHOW FROM HERE //
import { observed } from '@anchor/react/components';
import { profileState, schema } from '@lib/auth.js';

export const AuthOutput: FC = observed(() => {
  const output = schema.safeParse(profileState);
  const outputCode = JSON.stringify(output, null, 2);

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-200 flex-1">🛡️ Validation</h3>
      </CardHeader>
      <CodeBlock code={outputCode} />
    </Card>
  );
}, 'AuthOutput');
