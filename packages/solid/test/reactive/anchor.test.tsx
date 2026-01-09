/** @jsxImportSource solid-js */

import { render } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { onCleanup } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { anchorRef, mutable } from '../../src/index.js';

const user = userEvent.setup();

describe('Anchor Solid - Reactive', () => {
  describe('anchorRef', () => {
    describe('Basic Usage', () => {
      it('should render and re-render the updated state', async () => {
        const handler = vi.fn();
        const handler2 = vi.fn();
        const xState = mutable({ count: 0 });

        const Counter = () => {
          const state = anchorRef({ count: 0 });

          onCleanup(handler);

          return (
            <div>
              <p>Count: {state.count}</p>
              <button onClick={() => state.count++}>Click</button>
            </div>
          );
        };

        const { getByRole, unmount } = render(() => <Counter />);
        const text = getByRole('paragraph');
        const button = getByRole('button');

        expect(text.textContent).toBe('Count: 0');
        await user.click(button);
        expect(text.textContent).toBe('Count: 1');

        unmount();

        expect(handler).toHaveBeenCalled();
        expect(handler2).not.toHaveBeenCalled();
      });
    });
  });
});
