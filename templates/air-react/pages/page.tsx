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
import { uuid } from '@airlib/react/utils';
import airLogo from '@/assets/airlib.svg';
import mouse from '@/assets/cursor.svg';
import mouseDown from '@/assets/cursor-down.svg';
import heroImg from '@/assets/hero.png?asset' with { sizes: '170' };
import reactLogo from '@/assets/react.svg';
import viteLogo from '@/assets/vite.svg';
import { TextInput } from '@/components/TextInput.js';
import { visitor } from './function.js';
import { rootIndexRoute } from './route.js';

export default page(rootIndexRoute).render(() => {
  const user = mutable({ id: uuid(), cursor: { x: 0, y: 0 }, message: '' });
  const count = mutable(0);

  const visitors = visitor.join.once(user);
  const users = derived(() => Object.values(visitors.data));

  const [schedule, unschedule] = debouncer(1000 / 30);
  effect.client(() => {
    const { x, y, button } = LIVE_CURSOR;
    schedule(() => {
      Object.assign(user.cursor, { x, y, down: button === 'left' });
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

  return (
    <>
      <Head meta={{ title: 'AirLib', description: 'AirLib starter template.' }} />
      <For each={() => users.value}>
        {({ id, cursor, message }) => (
          <Show when={() => id !== user.id}>
            {() => (
              <div
                className="user-cursor"
                style={{ transform: `translate3d(${cursor.x}px, ${cursor.y}px, 0)`, left: '-12px', top: '-12px' }}
              >
                {message && <div className="chat-bubble">{message}</div>}
                <img src={cursor.down ? mouseDown : mouse} alt="cursor" width="24" height="24" />
              </div>
            )}
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