import { describe, expectTypeOf, it } from 'vitest';
import type { ExtractPathParams, None, RouteSegment } from '../../src/index.js';

describe('ExtractPathParams', () => {
  it('extracts path params only when no query params', () => {
    type Result = ExtractPathParams<'/users/:id'>;
    expectTypeOf<Result>().toEqualTypeOf<{ params: { id: string }; query: None }>();
  });

  it('extracts query params only when no path params', () => {
    type Result = ExtractPathParams<'/users?filter'>;
    expectTypeOf<Result extends { params: None; query: { filter?: string } } ? true : false>().toEqualTypeOf<true>();
  });

  it('extracts both path and query params', () => {
    type Result = ExtractPathParams<'/users/:id?filter=:filter'>;
    expectTypeOf<
      Result extends { params: { id: string }; query: { filter: string } } ? true : false
    >().toEqualTypeOf<true>();
  });

  it('extracts multiple path params and query params', () => {
    type Result = ExtractPathParams<'/users/:userId/posts/:postId?filter=(object)&limit=(number)'>;

    expectTypeOf<Result>().toHaveProperty('params');
    expectTypeOf<Result>().toHaveProperty('query');

    expectTypeOf<Result['params']>().toHaveProperty('userId');
    expectTypeOf<Result['params']>().toHaveProperty('postId');
    expectTypeOf<Result['query']>().toHaveProperty('filter');
    expectTypeOf<Result['query']>().toHaveProperty('limit');

    expectTypeOf<
      Result extends {
        params: { userId: string; postId: string };
        query: { filter: Record<string, unknown>; limit: number };
      }
        ? true
        : false
    >().toEqualTypeOf<true>();
  });

  it('handles complex path with multiple typed params and queries', () => {
    type Result = ExtractPathParams<'/orgs/:orgId(number)/teams/:teamId?includeMembers=(boolean)&sort=:sort'>;

    expectTypeOf<Result['params']>().toHaveProperty('orgId');
    expectTypeOf<Result['params']>().toHaveProperty('teamId');
    expectTypeOf<Result['query']>().toHaveProperty('includeMembers');
    expectTypeOf<Result['query']>().toHaveProperty('sort');

    expectTypeOf<
      Result extends {
        params: { orgId: number; teamId: string };
        query: { includeMembers: boolean; sort: string };
      }
        ? true
        : false
    >().toEqualTypeOf<true>();
  });

  it('handles root path with params and queries', () => {
    type Result = ExtractPathParams<'/:id?filter=:filter'>;
    expectTypeOf<
      Result extends { params: { id: string }; query: { filter: string } } ? true : false
    >().toEqualTypeOf<true>();
  });

  it('handles complex nested path with multiple typed params and queries', () => {
    type Result =
      ExtractPathParams<'/orgs/:orgId/projects/:projectId/issues/:issueId?status=:status&priority=(number)&assignee=:assignee'>;

    expectTypeOf<Result['params']>().toHaveProperty('orgId');
    expectTypeOf<Result['params']>().toHaveProperty('projectId');
    expectTypeOf<Result['params']>().toHaveProperty('issueId');
    expectTypeOf<Result['query']>().toHaveProperty('status');
    expectTypeOf<Result['query']>().toHaveProperty('priority');
    expectTypeOf<Result['query']>().toHaveProperty('assignee');

    expectTypeOf<
      Result extends {
        params: { orgId: string; projectId: string; issueId: string };
        query: { status: string; priority: number; assignee: string };
      }
        ? true
        : false
    >().toEqualTypeOf<true>();
  });

  it('handles path with static query values and dynamic params', () => {
    type Result = ExtractPathParams<'/search/:query?format=json&limit=(number)&offset=(number)'>;

    expectTypeOf<Result['params']>().toHaveProperty('query');
    expectTypeOf<Result['query']>().toHaveProperty('format');
    expectTypeOf<Result['query']>().toHaveProperty('limit');
    expectTypeOf<Result['query']>().toHaveProperty('offset');

    expectTypeOf<
      Result extends {
        params: { query: string };
        query: { format: 'json'; limit: number; offset: number };
      }
        ? true
        : false
    >().toEqualTypeOf<true>();
  });

  it('handles path with only static query values', () => {
    type Result = ExtractPathParams<'/users?filter=active&sort=name'>;
    expectTypeOf<
      Result extends { params: None; query: { filter: 'active'; sort: 'name' } } ? true : false
    >().toEqualTypeOf<true>();
  });

  it('handles empty path with query params', () => {
    type Result = ExtractPathParams<'?filter=:filter'>;
    expectTypeOf<Result extends { params: None; query: { filter: string } } ? true : false>().toEqualTypeOf<true>();
  });

  it('handles complex scenario with all parameter types', () => {
    type Result =
      ExtractPathParams<'/api/:version(v)/resources/:resourceId?filter&limit=(number)&enabled=(boolean)&format=json'>;

    expectTypeOf<Result['params']>().toHaveProperty('version');
    expectTypeOf<Result['params']>().toHaveProperty('resourceId');
    expectTypeOf<Result['query']>().toHaveProperty('filter');
    expectTypeOf<Result['query']>().toHaveProperty('limit');
    expectTypeOf<Result['query']>().toHaveProperty('enabled');
    expectTypeOf<Result['query']>().toHaveProperty('format');

    expectTypeOf<
      Result extends {
        params: { version: string; resourceId: string };
        query: { filter?: string; limit: number; enabled: boolean; format: 'json' };
      }
        ? true
        : false
    >().toEqualTypeOf<true>();
  });
});