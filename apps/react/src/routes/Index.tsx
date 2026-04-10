import { sleep } from '@anchorlib/core';
import { Link, route } from '@anchorlib/react/router';
import { rootRoute } from './route.js';
import Settings from './settings/Index.js';
import UserList from './users/UserList.js';

export const RootRoute = route(
  rootRoute
    .provide('setting', async () => {
      await sleep(1000);
      return { theme: 'light' };
    })
    .render((_state, _ctx, children) => (
      <main>
        <header>
          <h1>My App</h1>
          <nav className={'flex items-center gap-4'}>
            <Link href={'/'}>Home</Link>
            <Link to={UserList}>Users</Link>
            <Link to={Settings}>Settings</Link>
          </nav>
        </header>
        {children}
      </main>
    ))
);

export default RootRoute;
