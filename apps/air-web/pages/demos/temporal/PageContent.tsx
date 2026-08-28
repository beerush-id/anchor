import { anchor, debouncer, effect, mutable, onCleanup, Snippet, shortId, untrack } from '@airlib/react';
import { LIVE_KEYBOARD } from '@airlib/react/browser';
import { MessageInput } from './components/MessageInput.js';
import { StatsOverlay } from './components/StatsOverlay.js';
import { World } from './components/World.js';
import { PLAYER_RADIUS, SPEED_PPS, temporal, WORLD_SIZE } from './function.js';
import { randomSpawnCoord } from './utils.js';

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'];
const MIN_BOUND = PLAYER_RADIUS;

export default () => {
  const { width: maxX, height: maxY } = WORLD_SIZE;
  const spawn = randomSpawnCoord();

  const me = mutable({
    id: shortId(),
    name: `Guest-${shortId().slice(-4)}`,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    x: spawn.x,
    y: spawn.y,
  });

  const stream = temporal.join.once(me);
  const [schedule, unschedule] = debouncer(1000 / 30);

  let stepper: ReturnType<typeof requestAnimationFrame> | undefined;
  let lastTime = 0;

  const step = (time: DOMHighResTimeStamp) => {
    const key = untrack(() => LIVE_KEYBOARD.key);
    if (!key) return;

    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0.016;
    lastTime = time;
    const distance = SPEED_PPS * dt;

    let { x, y } = untrack(() => ({ x: me.x, y: me.y }));
    let moved = false;

    if (key === 'w' || key === 'arrowup') {
      y = Math.max(MIN_BOUND, y - distance);
      moved = true;
    } else if (key === 's' || key === 'arrowdown') {
      y = Math.min(maxY - MIN_BOUND, y + distance);
      moved = true;
    } else if (key === 'a' || key === 'arrowleft') {
      x = Math.max(MIN_BOUND, x - distance);
      moved = true;
    } else if (key === 'd' || key === 'arrowright') {
      x = Math.min(maxX - MIN_BOUND, x + distance);
      moved = true;
    }

    if (moved) {
      anchor.assign(me, { x, y });
      schedule(() => {
        temporal.move({ id: me.id, x, y });
      });
    }

    stepper = requestAnimationFrame(step);
  };

  const tick = () => {
    if (stepper) return;
    lastTime = performance.now();
    stepper = requestAnimationFrame(step);
  };

  const untick = () => {
    cancelAnimationFrame(stepper!);
    stepper = undefined;
    lastTime = 0;
  };

  effect.client(() => {
    LIVE_KEYBOARD.key ? tick() : untick();
  });

  onCleanup(() => {
    untick();
    unschedule();
  });

  return (
    <main className="relative h-[calc(100vh-4rem)] w-full overflow-hidden bg-slate-950">
      <Snippet data={() => stream.data.stats}>
        {(stats) => <StatsOverlay stats={stats} connected={!!stats.activeCount} playerName={me.name} />}
      </Snippet>
      <Snippet data={() => stream.data}>
        {({ players, stats }) => <World players={players} stats={stats} me={me} />}
      </Snippet>
      <MessageInput userId={me.id} />
    </main>
  );
};
