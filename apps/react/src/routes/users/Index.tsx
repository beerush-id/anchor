import { sleep } from '@anchorlib/core';
import { route } from '@anchorlib/react/router';
import { usersRoute } from './route.js';

export const UsersRoute = route(
  usersRoute
    .provide('meta', async () => {
      await sleep(2000);

      return { title: 'All Users' };
    })
    .render((_state, _ctx, children) => {
      return (
        <div>
          <header>Users</header>
          {children}
        </div>
      );
    })
);

export default UsersRoute;
