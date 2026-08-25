import worker from '../dist/server/worker.js';

export default {
  fetch(req, env) {
    // Use the explicit signal since Cloudflare uses request level signal
    // to handle client abort instead of on the readble stream's signal.
    return worker.fetch(req, env, req.signal);
  },
};
