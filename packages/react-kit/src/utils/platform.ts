export function isMobile() {
  return isBrowser() && window.innerWidth < 768;
}

export function isBrowser() {
  return typeof window !== 'undefined';
}
