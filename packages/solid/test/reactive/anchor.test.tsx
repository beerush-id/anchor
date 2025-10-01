import { describe, expect, it } from 'vitest';
import { render } from '@solidjs/testing-library';
import { anchorRef } from '../../src/index.js';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

describe('Anchor Solid - Reactive', () => {
  describe('anchorRef', () => {
    describe('Basic Usage', () => {
      it('should render and re-render the updated state', async () => {
        const Counter = () => {
          const state = anchorRef({ count: 0 });

          return (
            <div>
              <p>Count: {state.count}</p>
              <button onClick={() => state.count++}>Click</button>
            </div>
          );
        };

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const { getByRole } = render(() => <Counter />);
        const text = getByRole('paragraph');
        const button = getByRole('button');

        expect(text.textContent).toBe('Count: 0');
        await user.click(button);
        expect(text.textContent).toBe('Count: 1');
      });
    });
  });
});
