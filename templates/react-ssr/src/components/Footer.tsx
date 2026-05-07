import { template } from '@anchorlib/react';

export const Footer = template(() => {
  return (
    <footer className="app-footer">
      <p>
        Built with{' '}
        <a href="https://github.com/beerush-id/anchor" target="_blank" rel="noreferrer">Anchor</a>
        {' + '}
        <a href="https://vite.dev" target="_blank" rel="noreferrer">Vite</a>
        {' + '}
        <a href="https://react.dev" target="_blank" rel="noreferrer">React</a>
      </p>
    </footer>
  );
}, 'Footer');
export default Footer;
