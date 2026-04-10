import { Link, route } from '@anchorlib/react/router';
import home from '../Index.js';
import { settingsRoute } from './route.js';

export const SettingsRoute = route(
  settingsRoute.render(() => {
    return (
      <div>
        <h1>Settings</h1>
        <Link to={home}>Back</Link>
      </div>
    );
  })
);

export default SettingsRoute;
