import { $bind, effect, For, Head, onCleanup, page, Show } from '@airlib/solid';
import { LIVE_CURSOR, LIVE_KEYBOARD } from '@airlib/solid/browser';
import { $do, debouncer, mutable } from '@airlib/solid/core';
import { uuid } from '@airlib/solid/utils';
import airLogo from '@/assets/airlib.svg';
import mouse from '@/assets/cursor.svg';
import mouseDown from '@/assets/cursor-down.svg';
import heroImg from '@/assets/hero.png?airimg' with { sizes: '170' };
import solidLogo from '@/assets/solid.svg';
import viteLogo from '@/assets/vite.svg';
import { TextInput } from '@/components/TextInput.tsx';
import { type Visitor, visitor } from './function.ts';
import { rootIndexRoute } from './route.ts';

export default page(rootIndexRoute).render(() => {
  const count = mutable(0);
  const user = mutable({ id: uuid(), cursor: { x: 0, y: 0 }, message: '' });

  const visitors = visitor.join.once(user);

  const [schedule, unschedule] = debouncer(1000 / 30);
  effect(() => {
    const { x, y, button } = LIVE_CURSOR;
    schedule(() => {
      const target = LIVE_CURSOR.target ? getUniqueSelector(LIVE_CURSOR.target) : '';
      Object.assign(user.cursor, { x, y, down: button === 'left', target });
      visitor.move(user);
    });
  });

  effect(() => {
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
      <For each={Object.values(visitors.data || {})}>
        {(v) => (
          <Show when={v.id !== user.id}>
            {() => {
              emit(v.id, v.cursor);
              return (
                <div
                  class="user-cursor"
                  style={{ transform: `translate3d(${v.cursor.x}px, ${v.cursor.y}px, 0)`, left: 0, top: 0 }}
                >
                  <Show when={v.message}>
                    <div class="chat-bubble">{v.message}</div>
                  </Show>
                  <img src={v.cursor.down ? mouseDown : mouse} alt="cursor" width="24" height="24" />
                </div>
              );
            }}
          </Show>
        )}
      </For>
      <section id="center">
        <div class="hero-list">
          <img src={airLogo} class="airlib" width="179" height="179" alt="AirLib logo" />
          <div class="hero">
            <img src={heroImg.src} class="base" width="170" height="179" alt="Hero" />
            <img src={solidLogo} class="framework" alt="Solid logo" />
            <img src={viteLogo} class="vite" alt="Vite logo" />
          </div>
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/pages/page.tsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <div style={{ display: 'flex', 'flex-direction': 'column', 'align-items': 'center' }}>
          <button type="button" class="counter" onClick={() => count.value++}>
            Count is {count.value}
          </button>
          <TextInput class="message-input" placeholder="Type message..." value={$bind(user, 'message')} />
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