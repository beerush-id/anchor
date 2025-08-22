import AuthOutputCode from './AuthOutput.js?raw';
import { Card } from '../Card.js';
import { CodeBlock } from '../CodeBlock.js';

export const AuthCode = () => {
  return (
    <Card className="flex-1w">
      <CodeBlock code={AuthOutputCode.split('export ')[1]} />
    </Card>
  );
};
