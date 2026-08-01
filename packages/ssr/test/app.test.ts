import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/index.js';

vi.mock('../src/worker.js', () => ({
  createWorker: vi.fn(() => ({ type: 'worker' })),
  createFullWorker: vi.fn(() => ({ type: 'full-worker' })),
}));

vi.mock('../src/renderer.js', () => ({
  createRenderer: vi.fn(() => 'mock-renderer'),
}));

describe('createApp', () => {
  it('creates standard worker when no httpRouter is provided', () => {
    const renderView = vi.fn();
    const router = {} as any;

    const app = createApp(renderView, { router });

    expect(app).toEqual({ type: 'worker' });
  });

  it('creates full worker when httpRouter is provided', () => {
    const renderView = vi.fn();
    const router = {} as any;
    const httpRouter = {} as any;

    const app = createApp(renderView, { router, httpRouter });

    expect(app).toEqual({ type: 'full-worker' });
  });
});
