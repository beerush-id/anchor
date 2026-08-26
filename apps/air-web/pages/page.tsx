import { debouncer, derived, effect, For, Head, mutable, onCleanup, page, Show, uIndex } from '@airlib/react';
import { LIVE_CURSOR, LIVE_KEYBOARD } from '@airlib/react/browser';
import { $do } from '@airlib/react/core';
import { CODE_GROUP_INDEX } from '@airlib/react/mdx';
import { uuid } from '@airlib/react/utils';
import mouse from '@/assets/cursor.svg';
import mouseDown from '@/assets/cursor-down.svg';
import { Features } from '../components/Features.js';
import { Advanced } from '../components/features/Advanced.js';
import { FineGrained } from '../components/features/FineGrained.js';
import { Irpc } from '../components/features/Irpc.js';
import { Router } from '../components/features/Router.js';
import { Runtime } from '../components/features/Runtime.js';
import { UniversalSsr } from '../components/features/UniversalSsr.js';
import { Workflow } from '../components/features/Workflow.js';
import { Hero } from '../components/Hero.js';
import { type Visitor, visitor } from './function.ts';
import { rootIndexRoute } from './route.ts';

export default page(rootIndexRoute).render(() => {
  const user = mutable({ id: uuid(), cursor: { x: 0, y: 0 }, message: '' });

  const visitors = visitor.join.once(user);
  const users = derived(() => Object.values(visitors.data));

  const [schedule, unschedule] = debouncer(1000 / 30);
  effect.client(() => {
    const { x, y, button } = LIVE_CURSOR;
    schedule(() => {
      const target = LIVE_CURSOR.target ? getUniqueSelector(LIVE_CURSOR.target) : '';
      Object.assign(user.cursor, { x, y, down: button === 'left', target });
      visitor.move(user);
    });
  });

  effect.client(() => {
    if (user.message && LIVE_KEYBOARD.is('Enter')) {
      visitor.chat(user).then(() => (user.message = ''));
    }
  });

  onCleanup(() => {
    unschedule();
  });

  const cursors = {} as Record<string, Visitor['cursor']>;

  function emit(id: string, cursor: Visitor['cursor']) {
    $do(() => {
      if (!cursors[id]) cursors[id] = { ...cursor };
      const current = cursors[id];

      if (current.down !== cursor.down) {
        Object.assign(current, cursor);

        if (current.down && current.target) {
          const node = document.querySelector(current.target);

          if (node) {
            node.dispatchEvent(
              new MouseEvent('click', {
                button: 0,
                clientX: current.x,
                clientY: current.y,
                bubbles: true,
                cancelable: true,
                view: window,
              })
            );
          }
        }
      }
    });
  }

  void uIndex(CODE_GROUP_INDEX, true);

  return (
    <>
      <Head meta={{ title: 'AirLib', description: 'AirLib starter template.' }} />
      <For each={() => users.value}>
        {({ id, cursor, message }) => (
          <Show when={() => id !== user.id}>
            {() => {
              emit(id, cursor);
              return (
                <div
                  className="fixed z-9999 transition-transform duration-100 drop-shadow-[0_0_5px_rgb(0_0_0/0.25)]"
                  style={{ transform: `translate3d(${cursor.x}px, ${cursor.y}px, 0)`, left: '-12px', top: '-12px' }}
                >
                  {message && (
                    <div className="pointer-events-none absolute bottom-full left-full ml-2 mb-2 rounded-[12px_12px_12px_0] bg-on-surface px-3 py-1.5 text-[13px] font-medium whitespace-nowrap text-surface shadow-pop origin-bottom-left animate-pop-in">
                      {message}
                    </div>
                  )}
                  <img src={cursor.down ? mouseDown : mouse} alt="cursor" width="24" height="24" />
                </div>
              );
            }}
          </Show>
        )}
      </For>
      <Hero />
      <Features />
      <FineGrained />
      <Irpc />
      <Router />
      <UniversalSsr />
      <Workflow />
      <Runtime />
      <Advanced />
    </>
  );
});

function getUniqueSelector(element: Element) {
  if (!(element instanceof Element)) return '';

  const selectors = [];
  let current = element;

  while (current) {
    if (current === document.body) {
      selectors.unshift('body');
      break;
    }

    let selector = current.id ? `#${current.id}` : current.tagName.toLowerCase();

    if (!current.id && current.parentElement) {
      const siblings = Array.from(current.parentElement.children);
      const index = siblings.indexOf(current);
      if (index !== 0) {
        selector += `:nth-child(${index + 1})`;
      }
    }

    selectors.unshift(selector);
    current = current.parentElement;
  }

  return selectors.join(' > ');
}
