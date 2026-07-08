import { AsyncLocalStorage } from 'node:async_hooks';

export class AnchorALS<T> extends AsyncLocalStorage<T> {}
