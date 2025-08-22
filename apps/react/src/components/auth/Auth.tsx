import { useState } from 'react';
import { anchor } from '@anchor/core';
import { AuthForm } from './AuthForm.js';
import { AuthOutput } from './AuthOutput.js';
import { AuthCode } from './AuthCode.js';
import { CodeBlock } from '../CodeBlock.js';
import { Card } from '../Card.js';

export const Auth = () => {
  const [formData] = useState(() => {
    return anchor({ name: '', email: '', password: '' });
  });

  return (
    <div className="flex items-start gap-4 mx-auto mt-10">
      <div className="flex flex-col gap-4 w-md">
        <AuthForm formData={formData} />
        <Card>
          <CodeBlock
            code={`export const Auth = () => {
  const [formData] = useState(() => {
    return anchor({ name: '', email: '', password: '' });
  });
  
  return <AuthForm formData={formData} />;
};`}
          />
        </Card>
      </div>
      <div className="flex flex-col gap-4 w-md">
        <AuthOutput formData={formData} />
        <AuthCode />
      </div>
    </div>
  );
};
