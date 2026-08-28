import { $bind, effect, For, Head, onCleanup, page, Show } from '@airlib/solid';
import { LIVE_CURSOR, LIVE_KEYBOARD } from '@airlib/solid/browser';
import { debouncer, mutable } from '@airlib/solid/core';
import { uuid } from '@airlib/solid/utils';
import airLogo from '@/assets/airlib.svg';
import mouse from '@/assets/cursor.svg';
import mouseDown from '@/assets/cursor-down.svg';
import heroImg from '@/assets/hero.png?airimg' with { sizes: '170' };
import solidLogo from '@/assets/solid.svg';
import viteLogo from '@/assets/vite.svg';
import { TextInput } from '@/components/TextInput.js';
import { visitor } from './function.js';
import { rootIndexRoute } from './route.js';

export default page(rootIndexRoute).render(() => {
  const count = mutable(0);
  const user = mutable({ id: uuid(), cursor: { x: 0, y: 0 }, message: '' });

  const visitors = visitor.join.once(user);

  const [schedule, unschedule] = debouncer(1000 / 30);
  effect(() => {
    const { x, y, button } = LIVE_CURSOR;
    schedule(() => {
      Object.assign(user.cursor, { x, y, down: button === 'left' });
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

  return (
    <>
      <Head meta={{ title: 'AirLib', description: 'AirLib starter template.' }} />
      <For each={Object.values(visitors.data || {})}>
        {(v) => (
          <Show when={v.id !== user.id}>
            {() => (
              <div
                class="user-cursor"
                style={{ transform: `translate3d(${v.cursor.x}px, ${v.cursor.y}px, 0)`, left: 0, top: 0 }}
              >
                <Show when={v.message}>
                  <div class="chat-bubble">{v.message}</div>
                </Show>
                <img src={v.cursor.down ? mouseDown : mouse} alt="cursor" width="24" height="24" />
              </div>
            )}
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