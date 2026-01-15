import { describe, expectTypeOf, it } from 'vitest';
import type { ExtractParams, None } from '../../src/index.js';

describe('ExtractParams', () => {
  it('extracts single param', () => {
    type Result = ExtractParams<'/:id'>;
    expectTypeOf<Result>().toEqualTypeOf<{ id: string }>();
  });

  it('extracts single param with string type', () => {
    type Result = ExtractParams<'/:id(string)'>;
    expectTypeOf<Result>().toEqualTypeOf<{ id: string }>();
  });

  it('extracts single param with number type', () => {
    type Result = ExtractParams<'/:id(number)'>;
    expectTypeOf<Result>().toEqualTypeOf<{ id: number }>();
  });

  it('extracts single param with boolean type', () => {
    type Result = ExtractParams<'/:id(boolean)'>;
    expectTypeOf<Result>().toEqualTypeOf<{ id: boolean }>();
  });

  it('extracts single param with null type', () => {
    type Result = ExtractParams<'/:id(null)'>;
    expectTypeOf<Result>().toEqualTypeOf<{ id: null }>();
  });

  it('extracts single param with array type', () => {
    type Result = ExtractParams<'/:id(array)'>;
    expectTypeOf<Result>().toEqualTypeOf<{ id: unknown[] }>();
  });

  it('extracts single param with object type', () => {
    type Result = ExtractParams<'/:id(object)'>;
    expectTypeOf<Result>().toEqualTypeOf<{ id: Record<string, unknown> }>();
  });

  it('extracts multiple params with default types', () => {
    type Result = ExtractParams<'/:id/posts/:postId'>;

    expectTypeOf<Result>().toHaveProperty('id');
    expectTypeOf<Result>().toHaveProperty('postId');
    expectTypeOf<Result extends { id: string; postId: string } ? true : false>().toEqualTypeOf<true>();
  });

  it('extracts multiple params with mixed types', () => {
    type Result = ExtractParams<'/:id(string)/posts/:postId(number)/comments/:commentId(boolean)'>;

    expectTypeOf<Result>().toHaveProperty('id');
    expectTypeOf<Result>().toHaveProperty('postId');
    expectTypeOf<Result>().toHaveProperty('commentId');
    expectTypeOf<
      Result extends { id: string; postId: number; commentId: boolean } ? true : false
    >().toEqualTypeOf<true>();
  });

  it('returns empty object for static paths', () => {
    type Result = ExtractParams<'/users'>;
    expectTypeOf<Result>().toEqualTypeOf<None>();
  });

  it('returns empty object for complex static paths', () => {
    type Result = ExtractParams<'/api/v1/users/123/posts/456'>;
    expectTypeOf<Result>().toEqualTypeOf<None>();
  });

  it('handles nested static and dynamic segments', () => {
    type Result = ExtractParams<'/users/:userId/posts/:postId/comments'>;

    expectTypeOf<Result>().toHaveProperty('userId');
    expectTypeOf<Result>().toHaveProperty('postId');
    expectTypeOf<Result extends { userId: string; postId: string } ? true : false>().toEqualTypeOf<true>();
  });

  it('handles complex nested paths with multiple params', () => {
    type Result = ExtractParams<'/orgs/:orgId/teams/:teamId/members/:memberId/profile'>;

    expectTypeOf<Result>().toHaveProperty('orgId');
    expectTypeOf<Result>().toHaveProperty('teamId');
    expectTypeOf<Result>().toHaveProperty('memberId');
    expectTypeOf<
      Result extends { orgId: string; teamId: string; memberId: string } ? true : false
    >().toEqualTypeOf<true>();
  });

  it('handles root path with param', () => {
    type Result = ExtractParams<'/:id'>;
    expectTypeOf<Result>().toEqualTypeOf<{ id: string }>();
  });

  it('handles param at end of path', () => {
    type Result = ExtractParams<'/users/:id'>;
    expectTypeOf<Result>().toEqualTypeOf<{ id: string }>();
  });
});