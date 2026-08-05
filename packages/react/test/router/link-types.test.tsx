import '../../src/client/index';
import { createRouter } from '@anchorlib/router';
import { describe, it } from 'vitest';
import { Link } from '../../src/router/link.js';
import { page } from '../../src/router/router.js';

const router = createRouter();
const blogsRoute = router.route('/blogs');
const blogsDynamicRoute = blogsRoute.route('/:slug');
const blogsIndexRoute = blogsRoute.route('/');
const BlogsDynamicPage = page(blogsDynamicRoute);

describe('link route-object types', () => {
  it('accepts bare route objects with required params', () => {
    // Valid: dynamic route with its params.
    <Link to={blogsDynamicRoute} params={{ slug: 'hello' }}>
      Blog
    </Link>;

    // @ts-expect-error - Missing required `params` for a dynamic route.
    <Link to={blogsDynamicRoute}>Blog</Link>;
  });

  it('accepts bare static routes without params', () => {
    <Link to={blogsRoute}>Blogs</Link>;
    <Link to={blogsIndexRoute}>Index</Link>;
  });

  it('rejects wrong param shapes', () => {
    // @ts-expect-error - `id` is not a param of this route.
    <Link to={blogsDynamicRoute} params={{ id: '1' }}>
      Blog
    </Link>;
  });

  it('still accepts route components for back-compat', () => {
    <Link to={BlogsDynamicPage} params={{ slug: 'hello' }}>
      Blog
    </Link>;

    // @ts-expect-error - Component form still requires the route params.
    <Link to={BlogsDynamicPage}>Blog</Link>;
  });
});
