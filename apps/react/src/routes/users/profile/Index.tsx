import { sleep } from '@anchorlib/core';
import { template } from '@anchorlib/react';
import { Link, route } from '@anchorlib/react/router';
import Users from '../Index.js';
import { profileRoute } from './route.js';

export const ProfileRoute = route(
  profileRoute
    .provide('profile', async ({ params }) => {
      await sleep(500);
      return { id: params.user_id, name: 'John' };
    })
    .render((state) => {
      const Title = template(() => {
        console.log(state.context?.data);
        if (state.status === 'pending') return <div>Loading...</div>;
        return <h1>{state.context?.data?.profile?.name}</h1>;
      }, 'Profile Title');

      return (
        <div>
          <h1>Profile</h1>
          <Title />
          <Link to={Users}>Back</Link>
        </div>
      );
    })
);

export default ProfileRoute;
