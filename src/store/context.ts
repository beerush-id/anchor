import { sessionContext, SessionStore } from './session.js';
import { persistentContext, PersistentStore } from './persistent.js';
import { cookie, setCookieContext } from './cookie.js';

type StoreCookie = {
  sessionId?: string;
  persistentId?: string;
}

export function createStoreContext(headers: Headers) {
  if (typeof window !== 'undefined') return;

  const destroyCookies = setCookieContext(headers);

  const [ setting ] = cookie<StoreCookie>();

  const sessionStore = setting.sessionId ? new SessionStore() : undefined;
  const persistentStore = setting.persistentId ? new PersistentStore() : undefined;

  let destroySession: () => void;
  let destroyPersistent: () => void;

  if (sessionStore) {
    destroySession = sessionContext(sessionStore) as never;
  }

  if (persistentStore) {
    destroyPersistent = persistentContext(persistentStore) as never;
  }

  return () => {
    destroyCookies?.();
    destroySession?.();
    destroyPersistent?.();
  };
}
