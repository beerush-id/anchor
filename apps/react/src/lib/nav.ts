import type { MouseEventHandler } from 'react';

export const BASE_PATH = '/anchor';

export const inlineNav: MouseEventHandler = (event) => {
  const href = (event.currentTarget as HTMLAnchorElement)?.getAttribute('href');
  if (!href) return;

  event.preventDefault();
  const element = document.querySelector(href);
  if (!element) return;

  const offsetTop = element.getBoundingClientRect().top + window.pageYOffset;
  window.scrollTo({
    top: offsetTop - 68,
    behavior: 'smooth',
  });
};

export function isMobile() {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}
