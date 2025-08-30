import { BookText, GithubIcon } from 'lucide-react';
import { Tooltip } from './Tooltip.js';
import { inlineNav } from '@lib/nav.js';
import { useEffect, useRef, useState } from 'react';

export const Header = () => {
  const ref = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > (ref.current?.offsetHeight ?? 68)) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    });
  }, []);

  return (
    <header ref={ref} className={`sticky top-0 z-50 ${scrolled ? 'bg-slate-900/10 backdrop-blur-xl' : ''}`}>
      <nav className="container mx-auto px-6 py-4 flex items-center gap-6 md:gap-20 max-w-6xl">
        <h1 className="tracking-tight flex items-center select-none">
          <a href="/">
            <img src="/images/anchor-dark.svg" alt="Anchor Logo" className="h-8" />
          </a>
          <span className="hidden">Anchor - Framework Agnostic State Management Library</span>
        </h1>
        <div className="hidden md:flex flex-1 justify-end gap-14">
          <a href="#hero" onClick={inlineNav} className="text-slate-300 hover:text-slate-100 transition-colors">
            Overview
          </a>
          <a href="#metrics" onClick={inlineNav} className="text-slate-300 hover:text-slate-100 transition-colors">
            Performance
          </a>
          <a href="#philosophy" onClick={inlineNav} className="text-slate-300 hover:text-slate-100 transition-colors">
            Philosophy
          </a>
          <a href="#architecture" onClick={inlineNav} className="text-slate-300 hover:text-slate-100 transition-colors">
            Architecture
          </a>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <a href="/docs" className="flex items-center text-slate-300 hover:text-slate-100 gap-1 transition-colors">
            <BookText className="w-4 h-4" />
            <span className="text-sm">Docs</span>
          </a>
          <a
            href="https://github.com/beerush-id/anchor"
            target="_blank"
            className="flex items-center text-slate-300 hover:text-slate-100 transition-colors">
            <GithubIcon className="w-4 h-4" />
            <Tooltip>GitHub</Tooltip>
          </a>
        </div>
      </nav>
    </header>
  );
};
