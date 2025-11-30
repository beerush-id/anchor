import type { FC } from 'react';
import { Card } from '../Card.js';
import { CodeBlock } from '../CodeBlock.js';
import { CardHeader } from '../CardHeader.js';
// SHOW FROM HERE //
import { observer } from '@anchorlib/react-classic/view';
import { profileState, schema } from '@lib/auth.js';

export const AuthOutput: FC = observer(() => {
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
