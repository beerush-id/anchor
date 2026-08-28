import { Link, onCleanup, onMount, setup } from '@airlib/react';
import docsRoute, { docsGettingStartedRoute } from '../pages/(docs)/route.js';

export const Hero = setup(() => {
  return (
    <section className={classes.root}>
      <div className={`air-section-inner ${classes.inner}`}>
        <div className={classes.content}>
          <p className={classes.badge}>
            <span aria-hidden="true" className={classes.badgeDot} />
            One Stack &middot; Framework Agnostic &middot; Deploy Anywhere
          </p>

          <h1 className="air-display leading-[1.15]">
            Zero-Boilerplate
            <br />
            Full Stack Framework
          </h1>

          <p className={classes.subtitle}>
            Fine-grained reactive state that stays in sync across server and client. Server functions you call like
            local ones. One codebase that renders on React and SolidJS. One build that runs on Bun, Node, Deno, or
            Workers.
          </p>

          <div className={classes.actions}>
            <Link to={docsGettingStartedRoute} className={classes.cta}>
              Get Started
            </Link>
            <Link to={docsRoute} className={classes.link}>
              Learn AirLib
            </Link>
          </div>

          <code className={classes.install}>bun create airlib my-air-app</code>
        </div>

        <Globe />
      </div>
    </section>
  );
});

const dotGrid =
  'bg-surface bg-[radial-gradient(color-mix(in_srgb,var(--color-on-surface)_14%,transparent)_1px,transparent_1px)] bg-size-[22px_22px]';

const classes = {
  root: `relative overflow-hidden border-b border-border ${dotGrid}`,
  inner:
    'relative z-(--z-content) grid items-center gap-10 py-12 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:pt-20 lg:pb-26 min-h-[min(44rem,calc(100svh_-_var(--spacing-header)))]',
  content: 'flex flex-col items-center text-center lg:items-start lg:text-left',
  badge:
    'inline-flex items-center gap-2 rounded-full border border-border bg-surface-variant px-3 py-1 text-xs font-semibold text-on-surface-variant',
  badgeDot: 'size-1.5 rounded-full bg-brand',
  subtitle: 'max-w-130 text-base text-on-surface-variant lg:text-lg',
  actions: 'mt-7 flex flex-wrap items-center justify-center gap-4 lg:justify-start',
  install:
    'mt-5 inline-flex rounded-lg border border-border bg-surface-variant px-4 py-2 font-mono text-sm text-on-surface',
  cta: 'air-cta',
  link: 'inline-flex items-center gap-2 rounded-md border border-border bg-surface-variant px-5 py-2.5 text-base font-semibold text-on-surface no-underline transition-shadow duration-300 hover:shadow-pop',
};

type Vec3 = { x: number; y: number; z: number };
type Arc = { from: Vec3; to: Vec3; phase: number; speed: number };
type ScreenPoint = { x: number; y: number; z: number };

const DOT_COUNT = 900;
const ARC_COUNT = 6;
const ROTATION_SPEED = 0.22;
const TILT = -0.4;
const PERSPECTIVE = 2.8;

// Fine-grained simulation timing (seconds).
const SIM_CYCLE = 3.6;
const SIM_READERS = 3;
const SIM_FLASH = 0.6;
const SIM_HOP = 0.3;
const SIM_DOT_FLASH = 0.4;
const SIM_TRAVEL = 1.2;

// Orders drain the stock until it runs low, then a single restock brings it back; sums to zero per period.
const STOCK_DELTAS = [-2, -1, -3, -2, 8];

const Globe = setup(() => {
  const classes = {
    globe:
      "relative mx-auto aspect-square w-full max-w-80 lg:max-w-115 [--globe-dot:var(--color-brand)] [--globe-arc:var(--color-brand)] before:absolute before:inset-0 before:rounded-full before:blur-2xl before:content-[''] before:bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-brand)_18%,transparent),transparent_75%)]",
    canvas: 'relative block h-full w-full',
  };

  let container: HTMLDivElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let frame = 0;
  let observer: ResizeObserver | undefined;

  onMount(() => {
    if (!container || !canvas) return;
    const containerEl = container;
    const canvasEl = canvas;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    const points = createSpherePoints(DOT_COUNT);
    const arcs = createArcs(points, ARC_COUNT);
    const simArcs = createSimArcs(points, SIM_READERS);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let color = '#0051ff';
    let readerColor = '#0051ff';
    let travelColor = '#16a34a';
    let bg = 'transparent';

    const draw = (angle: number, time: number) => {
      if (width === 0 || height === 0) return;
      drawGlobe(ctx, width, height, points, arcs, angle, time, color);
      drawSim(ctx, width, height, simArcs, angle, time, color, readerColor, travelColor, bg);
    };

    const resize = () => {
      // Canvas can't parse light-dark(), so resolve the colors through a probe element.
      const probe = document.createElement('span');
      containerEl.appendChild(probe);
      probe.style.color = 'var(--globe-dot)';
      color = getComputedStyle(probe).color || color;
      probe.style.color = 'var(--color-surface)';
      bg = getComputedStyle(probe).color || bg;
      probe.style.color = 'var(--color-primary)';
      readerColor = getComputedStyle(probe).color || readerColor;
      probe.style.color = 'var(--color-accent)';
      travelColor = getComputedStyle(probe).color || travelColor;
      probe.remove();

      const rect = containerEl.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvasEl.width = Math.round(width * dpr);
      canvasEl.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduceMotion) draw(0.6, 0);
    };

    observer = new ResizeObserver(resize);
    observer.observe(containerEl);
    resize();

    if (!reduceMotion) {
      let angle = 0.6;
      let time = 0;
      let last = performance.now();

      const tick = (now: number) => {
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;
        angle += dt * ROTATION_SPEED;
        time += dt;
        draw(angle, time);
        frame = requestAnimationFrame(tick);
      };

      frame = requestAnimationFrame(tick);
    }
  });

  onCleanup(() => {
    cancelAnimationFrame(frame);
    observer?.disconnect();
  });

  return (
    <div
      ref={(el) => {
        container = el;
      }}
      className={classes.globe}
      aria-hidden="true"
    >
      <canvas
        ref={(el) => {
          canvas = el;
        }}
        className={classes.canvas}
      />
    </div>
  );
});

function createSpherePoints(count: number): Vec3[] {
  const points: Vec3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    points.push({ x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius });
  }

  return points;
}

function createArcs(points: Vec3[], count: number): Arc[] {
  const arcs: Arc[] = [];
  let guard = 0;

  while (arcs.length < count && guard++ < 200) {
    const from = points[(Math.random() * points.length) | 0];
    const to = points[(Math.random() * points.length) | 0];
    const dot = from.x * to.x + from.y * to.y + from.z * to.z;
    if (dot > 0.85 || dot < -0.6) continue;
    arcs.push({ from, to, phase: Math.random(), speed: 0.1 + Math.random() * 0.12 });
  }

  return arcs;
}

function rotate(point: Vec3, angle: number): Vec3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const x = point.x * cos + point.z * sin;
  const z = point.z * cos - point.x * sin;
  const tiltCos = Math.cos(TILT);
  const tiltSin = Math.sin(TILT);
  return { x, y: point.y * tiltCos - z * tiltSin, z: point.y * tiltSin + z * tiltCos };
}

function drawGlobe(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  points: Vec3[],
  arcs: Arc[],
  angle: number,
  time: number,
  color: string
) {
  ctx.clearRect(0, 0, width, height);
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.44;

  const toScreen = (point: Vec3): ScreenPoint => {
    const scale = PERSPECTIVE / (PERSPECTIVE - point.z);
    return { x: cx + point.x * radius * scale, y: cy + point.y * radius * scale, z: point.z };
  };

  for (const point of points) {
    const q = toScreen(rotate(point, angle));
    const depth = (q.z + 1) / 2;
    ctx.globalAlpha = 0.1 + depth * 0.6;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(q.x, q.y, 0.7 + depth * 1.3, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const arc of arcs) {
    drawArc(ctx, arc, angle, time, toScreen, color);
  }

  ctx.globalAlpha = 1;
}

function drawArc(
  ctx: CanvasRenderingContext2D,
  arc: Arc,
  angle: number,
  time: number,
  toScreen: (point: Vec3) => ScreenPoint,
  color: string
) {
  const steps = 36;
  const trail = 0.22;
  const head = ((time * arc.speed + arc.phase) % 1.4) - 0.2;

  let prev = toScreen(rotate(arcPoint(arc.from, arc.to, 0), angle));

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const q = toScreen(rotate(arcPoint(arc.from, arc.to, t), angle));

    // Skip segments on the far side of the sphere.
    if (q.z < -0.15 || prev.z < -0.15) {
      prev = q;
      continue;
    }

    const depth = Math.max(0, (q.z + prev.z + 2) / 4);
    const distance = head - t;
    const inTrail = distance >= 0 && distance <= trail;

    ctx.globalAlpha = inTrail ? depth * (1 - distance / trail) * 0.8 : 0.04 + depth * 0.1;
    ctx.strokeStyle = color;
    ctx.lineWidth = inTrail ? 1.6 : 1;
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();

    prev = q;
  }
}

function arcPoint(from: Vec3, to: Vec3, t: number): Vec3 {
  const x = from.x + (to.x - from.x) * t;
  const y = from.y + (to.y - from.y) * t;
  const z = from.z + (to.z - from.z) * t;
  const length = Math.hypot(x, y, z) || 1;
  const lift = 1 + 0.18 * Math.sin(Math.PI * t);
  return { x: (x / length) * lift, y: (y / length) * lift, z: (z / length) * lift };
}

function createSimArcs(points: Vec3[], count: number): Arc[] {
  const from = points[0];
  const candidates: Vec3[] = [];

  for (let i = 1; i < points.length; i++) {
    const to = points[i];
    const dot = from.x * to.x + from.y * to.y + from.z * to.z;
    if (dot > -0.4 && dot < 0.2) candidates.push(to);
  }

  const arcs: Arc[] = [];

  for (let i = 0; i < count; i++) {
    const to = candidates.length
      ? candidates[Math.floor((candidates.length * i) / count)]
      : points[Math.floor((points.length * (i + 1)) / (count + 1))];

    arcs.push({ from, to, phase: 0, speed: 0 });
  }

  return arcs;
}

function stockAt(cycle: number): number {
  let value = 86;

  for (let i = 0; i < cycle % STOCK_DELTAS.length; i++) {
    value += STOCK_DELTAS[i];
  }

  return value;
}

function easeInOut(t: number): number {
  return t * t * (3 - 2 * t);
}

function phase(t: number, start: number, duration: number): number {
  return t >= start && t < start + duration ? (t - start) / duration : -1;
}

function lerpPoint(from: { x: number; y: number }, to: { x: number; y: number }, z: number, k: number): ScreenPoint {
  return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, z };
}

function drawSim(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  arcs: Arc[],
  angle: number,
  time: number,
  color: string,
  readerColor: string,
  travelColor: string,
  bg: string
) {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.44;

  const toScreen = (point: Vec3): ScreenPoint => {
    const q = rotate(point, angle);
    const scale = PERSPECTIVE / (PERSPECTIVE - q.z);
    return { x: cx + q.x * radius * scale, y: cy + q.y * radius * scale, z: q.z };
  };

  // The whole simulation is a pure function of time.
  const cycle = Math.floor(time / SIM_CYCLE);
  const t = time - cycle * SIM_CYCLE;

  // Beat starts, in order: mutate, hop in, server dot, travel, land and update on the readers.
  const tHopIn = SIM_FLASH;
  const tServerDot = tHopIn + SIM_HOP;
  const tTravel = tServerDot + SIM_DOT_FLASH;
  // The number lands straight into the readers' slots — no sliding off the dot.
  const tUpdate = tTravel + SIM_TRAVEL;

  const serverValue = stockAt(cycle);
  // Every reader flips on the same beat — that is the in-sync point.
  const readerValue = stockAt(t >= tUpdate ? cycle : Math.max(cycle - 1, 0));

  const serverLabelFlash = phase(t, 0, SIM_FLASH);
  const hopIn = phase(t, tHopIn, SIM_HOP);
  const serverDotFlash = phase(t, tServerDot, SIM_DOT_FLASH);
  const travel = phase(t, tTravel, SIM_TRAVEL);
  const readerDotFlash = phase(t, tUpdate, SIM_DOT_FLASH);
  const readerLabelFlash = phase(t, tUpdate, SIM_FLASH);

  const from = toScreen(arcs[0].from);

  drawSimNode(ctx, from, color, serverDotFlash, 5);
  const fromNum = drawSimLabel(ctx, from, cx, cy, 'product.stock = ', `${serverValue}`, color, bg, serverLabelFlash);

  for (const arc of arcs) {
    const to = toScreen(arc.to);

    // Faint route of the simulation channel.
    ctx.strokeStyle = travelColor;
    ctx.lineWidth = 1;

    let prev = toScreen(arcPoint(arc.from, arc.to, 0));

    for (let i = 1; i <= 36; i++) {
      const q = toScreen(arcPoint(arc.from, arc.to, i / 36));

      if (q.z >= -0.15 && prev.z >= -0.15) {
        ctx.globalAlpha = 0.12;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }

      prev = q;
    }

    drawSimNode(ctx, to, readerColor, readerDotFlash, 5);
    drawSimLabel(ctx, to, cx, cy, 'Stock: ', `${readerValue}`, readerColor, bg, readerLabelFlash);

    // The transmitted copy: number hops to the server dot, crosses the wire as dot + number,
    // and lands straight into the reader label's number on arrival.
    let carrier: ScreenPoint | undefined;
    let withDot = false;

    if (hopIn >= 0) carrier = lerpPoint(fromNum, from, from.z, easeInOut(hopIn));
    else if (serverDotFlash >= 0) carrier = from;
    else if (travel >= 0) {
      carrier = toScreen(arcPoint(arc.from, arc.to, travel));
      withDot = true;
    }

    if (carrier) {
      if (withDot) drawSimNode(ctx, carrier, travelColor, -1, 3.2);
      drawSimLabel(ctx, carrier, cx, cy, '', `${serverValue}`, travelColor, bg, -1, true);
    }
  }

  ctx.globalAlpha = 1;
}

function drawSimNode(ctx: CanvasRenderingContext2D, point: ScreenPoint, color: string, pulse: number, radius: number) {
  const depth = (point.z + 1) / 2;

  ctx.fillStyle = color;
  ctx.globalAlpha = 0.25 + depth * 0.75;
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fill();

  if (pulse >= 0) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = (1 - pulse) * 0.5;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius + 2 + pulse * 9, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawSimLabel(
  ctx: CanvasRenderingContext2D,
  point: ScreenPoint,
  cx: number,
  cy: number,
  prefix: string,
  value: string,
  color: string,
  bg: string,
  flash = -1,
  centered = false
): { x: number; y: number } {
  const depth = (point.z + 1) / 2;
  const dx = point.x - cx;
  const dy = point.y - cy;
  const length = Math.hypot(dx, dy) || 1;

  ctx.font = '600 14px ui-monospace, Consolas, monospace';

  const padding = 6;
  const text = prefix + value;
  const boxWidth = ctx.measureText(text).width + padding * 2;
  const boxHeight = 22;
  // Node labels sit offset from their dot; the traveling pill is centered on its carrier.
  const x = centered ? point.x - boxWidth / 2 : dx >= 0 ? point.x + 16 : point.x - 16 - boxWidth;
  const y = centered ? point.y - boxHeight / 2 : point.y + (dy / length) * 18 - boxHeight / 2;
  const prefixWidth = ctx.measureText(prefix).width;
  const valueWidth = ctx.measureText(value).width;
  const valueX = x + padding + prefixWidth + valueWidth / 2;

  // Surface pill keeps the label readable over the rotating dots.
  ctx.globalAlpha = 0.55 + depth * 0.45;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x, y, boxWidth, boxHeight, 6);
  ctx.fill();

  // Flash the just-updated value so the change is impossible to miss.
  if (flash >= 0) {
    ctx.globalAlpha = (1 - flash) * 0.35;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x + padding + prefixWidth - 3, y + 3, valueWidth + 6, boxHeight - 6, 4);
    ctx.fill();
  }

  ctx.globalAlpha = 0.65 + depth * 0.35 + (flash >= 0 ? (1 - flash) * 0.35 : 0);
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padding, y + boxHeight / 2);

  return { x: valueX, y: y + boxHeight / 2 };
}
