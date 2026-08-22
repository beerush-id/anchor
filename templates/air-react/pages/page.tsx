import {
  $bind,
  debouncer,
  derived,
  effect,
  For,
  Head,
  Image,
  mutable,
  onCleanup,
  page,
  Show,
  Snippet,
} from '@airlib/react';
import { LIVE_CURSOR, LIVE_KEYBOARD } from '@airlib/react/browser';
import { $do } from '@airlib/react/core';
import { uuid } from '@airlib/react/utils';
import airLogo from '@/assets/airlib.svg';
import mouse from '@/assets/cursor.svg';
import mouseDown from '@/assets/cursor-down.svg';
import heroImg from '@/assets/hero.png?asset' with { sizes: '170' };
import reactLogo from '@/assets/react.svg';
import viteLogo from '@/assets/vite.svg';
import { TextInput } from '@/components/TextInput.tsx';
import { type Visitor, visitor } from './function.ts';
import { rootIndexRoute } from './route.ts';

export default page(rootIndexRoute).render(() => {
  const user = mutable({ id: uuid(), cursor: { x: 0, y: 0 }, message: '' });
  const count = mutable(0);

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
                  className="user-cursor"
                  style={{ transform: `translate3d(${cursor.x}px, ${cursor.y}px, 0)`, left: '-12px', top: '-12px' }}
                >
                  {message && <div className="chat-bubble">{message}</div>}
                  <img src={cursor.down ? mouseDown : mouse} alt="cursor" width="24" height="24" />
                </div>
              );
            }}
          </Show>
        )}
      </For>
      <section id="center">
        <div className="hero-list">
          <img src={airLogo} className="airlib" width="179" height="179" alt="AirLib logo" />
          <div className="hero">
            <Image from={heroImg} size={170} className="base" />
            <img src={reactLogo} className="framework" alt="React logo" />
            <img src={viteLogo} className="vite" alt="Vite logo" />
          </div>
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/pages/page.tsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Snippet>
            {() => (
              <button type="button" className="counter" onClick={() => count.value++}>
                Count is {count.value}
              </button>
            )}
          </Snippet>
          <TextInput value={$bind(user, 'message')} className="message-input" placeholder="Type message..." />
        </div>
      </section>
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