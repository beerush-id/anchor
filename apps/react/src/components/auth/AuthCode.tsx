import AuthOutputCode from './AuthOutput.js?raw';
import { Card } from '../Card.js';
import { CodeBlock } from '../CodeBlock.js';

export const AuthCode = () => {
  return (
    <Card className="flex-1">
      <CodeBlock className="flex-1" code={AuthOutputCode.split('// SHOW FROM HERE //\n')[1]} />
    </Card>
  );
};
