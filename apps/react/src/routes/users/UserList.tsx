import { template } from '@anchorlib/react';
import { Link, route } from '@anchorlib/react/router';
import Profile from './profile/Index.js';
import { usersRoute } from './route.js';

export const UserListRoute = route(
  usersRoute
    .route('/')
    .provide('users', () => [
      { id: '1', name: 'John' },
      { id: '2', name: 'Jane' },
    ])
    .render((state) => {
      const UserList = template(() => {
        console.log('Resolving?', state.resolving);
        console.log('Authenticating?', state.authenticating);

        return (
          <ul>
            {state.data?.users?.map((user) => (
              <li key={user.id}>
                <Link to={Profile} params={{ user_id: user.id }}>
                  {user.name}
                </Link>
              </li>
            ))}
          </ul>
        );
      }, 'User List');

      return (
        <div>
          <h3>All Users</h3>
          <UserList />
        </div>
      );
    })
);

export default UserListRoute;
