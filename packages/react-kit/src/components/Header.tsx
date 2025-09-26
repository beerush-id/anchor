import { type ComponentType, type HTMLAttributes, type SVGAttributes } from 'react';
import type { EFC } from '@base/index.js';
import { classx } from '@utils/index.js';
import { resolveProps, useObserver } from '@anchorlib/react';
import { observe } from '@anchorlib/react/view';
import { Tooltip } from './Tooltip.js';
import { useScrollNav } from '@actions/index.js';
import { ThemeSwitch } from './ThemeSwitch.js';

export type HeaderLogo = {
  text?: string;
  image?: EFC<SVGAttributes<SVGGElement>, SVGSVGElement> | ComponentType<SVGAttributes<SVGSVGElement>>;
  height?: number;
};

export type HeaderLink = {
  href: string;
  text: string;
  icon?: ComponentType;
};

export type HeaderSocial = {
  href: string;
  text?: string;
  tips?: string;
  icon?: EFC<SVGAttributes<SVGGElement>, SVGSVGElement> | ComponentType<SVGAttributes<SVGSVGElement>>;
};

export type HeaderProps = {
  logo?: HeaderLogo;
  links?: HeaderLink[];
  label?: string;
  socials?: HeaderSocial[];
  offset?: number;
};

const { brand } = classx;

export const Header: EFC<HTMLAttributes<HTMLHeadingElement> & HeaderProps, HTMLHeadingElement> = (props) => {
  const { logo, label, offset, links, socials, children, className, ...rest } = useObserver(
    () => resolveProps(props),
    [props]
  );

  const LogoView = observe<HTMLHeadingElement>(() => {
    if (!logo?.text) return;

    const { text, image: LogoImage, height } = logo;
    return (
      <h1 className={brand('header-logo')}>
        {LogoImage && (
          <a href="/">
            <LogoImage height={height ?? 32} />
          </a>
        )}
        <span className={classx('hidden', brand('header-title'))}>{text}</span>
      </h1>
    );
  });

  const LinksView = observe<HTMLUListElement>(() => {
    if (!links?.length) return;

    return (
      <ul className={brand('header-links')}>
        {links.map((link) => {
          const { href, text, icon: Icon } = link;

          return (
            <li key={href}>
              <a ref={useScrollNav(offset)} href={href} className={brand('header-link')}>
                {Icon && <Icon />}
                <span>{text}</span>
              </a>
            </li>
          );
        })}
      </ul>
    );
  });

  const SocialsView = observe<HTMLUListElement>(() => {
    if (!socials?.length) return;

    return (
      <ul className={brand('header-socials')}>
        {socials.map((social) => {
          const { href, text, tips, icon: Icon } = social;

          return (
            <li key={href}>
              <a href={href} className={brand('header-social')}>
                {Icon && <Icon className="w-4 h-4" />}
                {text && <span>{text}</span>}
                {tips && <Tooltip>{tips}</Tooltip>}
              </a>
            </li>
          );
        })}
      </ul>
    );
  });

  return (
    <header className={classx(brand('header'), className)} {...rest}>
      <nav className={brand('header-nav')} aria-label={label ?? 'Main Navigation'}>
        <LogoView />
        <LinksView />
        {children}
        <SocialsView />
        <ThemeSwitch />
      </nav>
    </header>
  );
};
