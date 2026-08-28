import { page } from '@airlib/react';
import temporalRoute from './route.js';

export default page(temporalRoute).renderAsync(async () => {
  return (await import('./PageContent.js')).default;
});
