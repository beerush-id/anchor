'use client';

import { BookText } from 'lucide-react';
import { setDebugRenderer, useAction } from '@anchorlib/react';
import { Header as MainHeader, type HeaderLink, type HeaderSocial } from '@anchorlib/react-kit/components';
import { DiscordIcon, GithubIcon } from '@anchorlib/react-kit/icons';
import { LogoText } from './LogoText';

setDebugRenderer(true);

const SCROLL_THRESHOLD = 68;

const links: HeaderLink[] = [
  {
    href: '#hero',
    text: 'Overview',
  },
  {
    href: '#features',
    text: 'Core Features',
  },
  {
    href: '#performance',
    text: 'Performance',
  },
  {
    href: '#todo-benchmark',
    text: 'Demos',
  },
];

const socials: HeaderSocial[] = [
  {
    href: '/docs',
    text: 'Docs',
    icon: BookText,
  },
  {
    href: 'https://github.com/beerush-id/anchor',
    tips: 'GitHub',
    icon: GithubIcon,
    className: 'hidden md:inline-flex',
  },
  {
    href: 'https://discord.gg/aEFgpaghq2',
    tips: 'Discord',
    icon: DiscordIcon,
    className: 'hidden md:inline-flex',
  },
];

export const Header = () => {
  const ref = useAction<HTMLHeadingElement>((element) => {
    if (!element?.parentElement) return;

    document.documentElement.style.setProperty('--header-height', `${element.offsetHeight}px`);
    const toggleBlur = () => {
      if (!element?.parentElement) return;

      if (window.scrollY > (element.offsetHeight ?? SCROLL_THRESHOLD)) {
        element.classList.add('scrolled');
      } else {
        element.classList.remove('scrolled');
      }
    };
    toggleBlur();

    window.addEventListener('scroll', toggleBlur);
    return () => {
      window.removeEventListener('scroll', toggleBlur);
    };
  });

  return (
    <>
      <MainHeader
        ref={ref}
        logo={{ text: 'Anchor - Framework Agnostic State Management Library', image: LogoText }}
        links={links}
        socials={socials}
        offset={SCROLL_THRESHOLD}
        className={'border-b border-b-white dark:border-b-transparent'}
      />
    </>
  );
};
