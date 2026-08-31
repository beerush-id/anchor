import { classx, cookiePair, effect, setup, uiRouterCtx } from '@airlib/react';

type ThemeMode = 'system' | 'light' | 'dark';

export const ThemeToggler = setup(() => {
  const ctx = uiRouterCtx.get();
  const isStatic = ctx?.router.activeRoute?.isStatic;
  const [theme, stored] = cookiePair('app-theme', { mode: 'system' as ThemeMode }, { deferred: isStatic });

  effect.client(() => {
    document.documentElement.dataset.theme = stored.mode;
  });

  return () => (
    <div className={classes.pill} data-theme={theme.mode}>
      <button
        type="button"
        aria-label="System theme"
        className={classx(classes.option, { 'active text-primary': theme.mode === 'system' })}
        onClick={() => (theme.mode = 'system')}
      >
        <MonitorIcon className="size-4.5" />
      </button>
      <button
        type="button"
        aria-label="Light theme"
        className={classx(classes.option, { 'active text-primary': theme.mode === 'light' })}
        onClick={() => (theme.mode = 'light')}
      >
        <SunIcon className="size-4.5" />
      </button>
      <button
        type="button"
        aria-label="Dark theme"
        className={classx(classes.option, { 'active text-primary': theme.mode === 'dark' })}
        onClick={() => (theme.mode = 'dark')}
      >
        <MoonIcon className="size-4.5" />
      </button>
    </div>
  );
});

const classes = {
  pill: 'fixed right-4 bottom-4 z-(--z-layout) flex flex-col gap-0.5 rounded-full border border-border bg-surface p-1 shadow-lg',
  option:
    'inline-flex size-7 items-center justify-center rounded-full text-on-surface transition-colors duration-200 ease-in-out hover:text-primary',
};

function MonitorIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
