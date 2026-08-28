/** @jsxImportSource solid-js */

import { render as renderDom } from '@solidjs/testing-library';
import { describe, expect, it } from 'vitest';
import '../src/client/index.js';
import { cookiePair } from '../src/cookie.js';
import { setup } from '../src/hoc.js';

describe('Anchor Solid - cookiePair', () => {
  it('creates a reactive cookie pair inside setup() and syncs getters and setters', async () => {
    let capturedTheme: { mode: string; fontSize: number } | undefined;
    let capturedStore: { mode: string; fontSize: number } | undefined;

    const TestComponent = setup(() => {
      const [theme, store] = cookiePair('user_theme_solid', { mode: 'light', fontSize: 14 });
      capturedTheme = theme;
      capturedStore = store;

      return (
        <div data-testid="theme">
          {theme.mode} - {theme.fontSize}
        </div>
      );
    });

    const { getByTestId, unmount } = renderDom(() => <TestComponent />);

    expect(getByTestId('theme').textContent).toBe('light - 14');
    expect(capturedTheme?.mode).toBe('light');
    expect(capturedStore?.mode).toBe('light');

    // Mutating via paired proxy forwards to store
    if (capturedTheme) capturedTheme.mode = 'dark';
    expect(capturedStore?.mode).toBe('dark');

    // Mutating store updates paired proxy
    if (capturedStore) capturedStore.fontSize = 16;
    expect(capturedTheme?.fontSize).toBe(16);

    unmount();
  });

  it('supports non-deferred cookiePair in component lifecycle', async () => {
    const TestComponent = setup(() => {
      const [theme] = cookiePair('session_theme_solid', { mode: 'system' });
      return <div>{theme.mode}</div>;
    });

    const { unmount } = renderDom(() => <TestComponent />);
    unmount();
  });

  it('supports deferred cookiePair in component lifecycle', async () => {
    const TestDeferred = setup(() => {
      const [pref] = cookiePair('pref_cookie_solid', { lang: 'en' }, { deferred: true });
      return <div>{pref.lang}</div>;
    });

    const { unmount } = renderDom(() => <TestDeferred />);
    unmount();
  });
});
