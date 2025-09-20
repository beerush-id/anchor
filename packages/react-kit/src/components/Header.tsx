import { type ComponentType, type HTMLAttributes, type SVGAttributes, useRef } from 'react';
import type { RFC } from '@utils/index.js';
import { classx } from '@utils/index.js';
import { debugRender, resolveProps, useObserver } from '@anchorlib/react';
import { observe } from '@anchorlib/react/view';
import { Tooltip } from './Tooltip.js';
import { useScrollNav } from '@actions/index.js';

export type HeaderLogo = {
  text?: string;
  image?: ComponentType<SVGAttributes<SVGSVGElement>>;
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
  icon?: ComponentType<SVGAttributes<SVGSVGElement>>;
};

export type HeaderProps = {
  logo?: HeaderLogo;
  links?: HeaderLink[];
  label?: string;
  socials?: HeaderSocial[];
};

const { brand } = classx;

export const Header: RFC<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement> & HeaderProps> = (props) => {
  const { ref, logo, label, links, socials, children, className, ...rest } = useObserver(
    () => resolveProps(props),
    [props]
  );
  const headerRef = useRef(null);

  debugRender(ref ?? headerRef);

  const LogoView = observe<HTMLHeadingElement>((ref) => {
    if (!logo?.text) return;

    debugRender(ref);

    const { text, image: LogoImage, height } = logo;
    return (
      <h1 ref={ref} className={brand('header-logo')}>
        {LogoImage && (
          <a href="/">
            <LogoImage height={height ?? 32} />
          </a>
        )}
        <span className={classx('hidden', brand('header-title'))}>{text}</span>
      </h1>
    );
  });

  const LinksView = observe<HTMLUListElement>((ref) => {
    if (!links?.length) return;

    debugRender(ref);

    return (
      <ul ref={ref} className={brand('header-links')}>
        {links.map((link) => {
          const { href, text, icon: Icon } = link;

          return (
            <li key={href}>
              <a ref={useScrollNav()} href={href} className={brand('header-link')}>
                {Icon && <Icon />}
                <span>{text}</span>
              </a>
            </li>
          );
        })}
      </ul>
    );
  });

  const SocialsView = observe<HTMLUListElement>((ref) => {
    if (!socials?.length) return;

    debugRender(ref);

    return (
      <ul ref={ref} className={brand('header-socials')}>
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
    <header ref={ref ?? headerRef} className={classx(brand('header'), className)} {...rest}>
      <nav className={brand('header-nav')} aria-label={label ?? 'Main Navigation'}>
        <LogoView />
        <LinksView />
        {children}
        <SocialsView />
      </nav>
    </header>
  );
};
