import type { FC } from 'react';
import { type AuthFormData, schema } from './auth-lib.js';
import { Card } from '../Card.js';
import { CodeBlock } from '../CodeBlock.js';
import { CardHeader } from '../CardHeader.js';
import { observed } from '@anchor/react/components';

export const AuthOutput: FC<{ formData: AuthFormData }> = observed(({ formData }) => {
  const output = schema.safeParse(formData);
  const outputCode = JSON.stringify(output, null, 2);

  return (
    <Card className="flex-1">
      <CardHeader>
        <h3 className="font-semibold text-slate-200 flex-1">🛡️ Validation</h3>
      </CardHeader>
      <CodeBlock code={outputCode} />
    </Card>
  );
}, 'AuthOutput');
