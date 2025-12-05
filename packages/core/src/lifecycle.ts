const DEFAULT_CLEANUP_HANDLER = (_handler: () => void) => {};
let onCleanUpHandler = DEFAULT_CLEANUP_HANDLER;

export function onCleanup(handler: () => void) {
  console.log('Can cleanup:', onCleanUpHandler !== DEFAULT_CLEANUP_HANDLER);
  return onCleanUpHandler(handler);
}

export function setCleanUpHandler(handler: (handler: () => void) => void) {
  onCleanUpHandler = handler;
}
