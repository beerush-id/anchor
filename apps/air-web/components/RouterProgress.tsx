import { Show, stylex, template } from '@airlib/react';
import router from '@/src/router.js';

export const RouterProgress = template(
  () => (
    <Show when={() => router.state.activating}>
      {() => (
        <div className="air-router-progress-bar">
          <div
            className="air-router-progress"
            style={stylex({ '--progress-width': `${(router.state.progress / router.state.steps) * 100}%` })}
          ></div>
        </div>
      )}
    </Show>
  ),
  'RouterProgress'
);
