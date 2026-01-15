import { describe, expectTypeOf, it } from 'vitest';
import type { ExtractQueryParams, None } from '../../src/index.js';

describe('ExtractQueryParams', () => {
  it('extracts single query param with default string type', () => {
    type Result = ExtractQueryParams<'/users?filter'>;
    expectTypeOf<Result>().toEqualTypeOf<{ filter?: string }>();
  });

  it('extracts single typed query param with number type', () => {
    type Result = ExtractQueryParams<'/users?limit=(number)'>;
    expectTypeOf<Result>().toEqualTypeOf<{ limit: number }>();
  });

  it('extracts single typed query param with boolean type', () => {
    type Result = ExtractQueryParams<'/users?enabled=(boolean)'>;
    expectTypeOf<Result>().toEqualTypeOf<{ enabled: boolean }>();
  });

  it('extracts single typed query param with null type', () => {
    type Result = ExtractQueryParams<'/users?value=(null)'>;
    expectTypeOf<Result>().toEqualTypeOf<{ value: null }>();
  });

  it('extracts single typed query param with array type', () => {
    type Result = ExtractQueryParams<'/users?ids=(array)'>;
    expectTypeOf<Result>().toEqualTypeOf<{ ids: unknown[] }>();
  });

  it('extracts single typed query param with object type', () => {
    type Result = ExtractQueryParams<'/users?config=(object)'>;
    expectTypeOf<Result>().toEqualTypeOf<{ config: Record<string, unknown> }>();
  });

  it('extracts multiple query params with default types', () => {
    type Result = ExtractQueryParams<'/users?filter&sort'>;

    expectTypeOf<Result>().toHaveProperty('filter');
    expectTypeOf<Result>().toHaveProperty('sort');
    expectTypeOf<Result extends { filter?: string; sort?: string } ? true : false>().toEqualTypeOf<true>();
  });

  it('extracts multiple query params with mixed types', () => {
    type Result = ExtractQueryParams<'/users?filter&limit=(number)&enabled=(boolean)'>;

    expectTypeOf<Result>().toHaveProperty('filter');
    expectTypeOf<Result>().toHaveProperty('limit');
    expectTypeOf<Result>().toHaveProperty('enabled');
    expectTypeOf<
      Result extends { filter?: string; limit: number; enabled: boolean } ? true : false
    >().toEqualTypeOf<true>();
  });

  it('returns empty object for paths without query params', () => {
    type Result = ExtractQueryParams<'/users'>;
    expectTypeOf<Result>().toEqualTypeOf<None>();
  });

  it('handles static query params with literal types', () => {
    type Result = ExtractQueryParams<'/users?filter=active&sort=name'>;
    expectTypeOf<Result extends { filter: 'active'; sort: 'name' } ? true : false>().toEqualTypeOf<true>();
  });

  it('handles mixed static and dynamic query params', () => {
    type Result = ExtractQueryParams<'/users?filter=active&sort&page=(number)'>;

    expectTypeOf<Result>().toHaveProperty('filter');
    expectTypeOf<Result>().toHaveProperty('sort');
    expectTypeOf<Result>().toHaveProperty('page');

    expectTypeOf<
      Result extends { filter: 'active'; sort?: string; page: number } ? true : false
    >().toEqualTypeOf<true>();
  });

  it('handles paths with both path params and query params', () => {
    type Result = ExtractQueryParams<'/users/:id/posts?filter=:filter'>;

    expectTypeOf<Result>().toHaveProperty('filter');
    expectTypeOf<Result extends { filter: string } ? true : false>().toEqualTypeOf<true>();
  });

  it('handles complex path with multiple path and query params', () => {
    type Result = ExtractQueryParams<'/users/:userId/posts/:postId/comments?filter=:filter&type=:type&limit=:limit'>;

    expectTypeOf<Result>().toHaveProperty('filter');
    expectTypeOf<Result>().toHaveProperty('type');
    expectTypeOf<Result>().toHaveProperty('limit');
    expectTypeOf<
      Result extends { filter: string; type: string; limit: string } ? true : false
    >().toEqualTypeOf<true>();
  });

  it('handles complex query params with multiple typed params', () => {
    type Result = ExtractQueryParams<'/search?q=:query&limit=(number)&offset=(number)&includeArchived=(boolean)'>;

    expectTypeOf<Result>().toHaveProperty('q');
    expectTypeOf<Result>().toHaveProperty('limit');
    expectTypeOf<Result>().toHaveProperty('offset');
    expectTypeOf<Result>().toHaveProperty('includeArchived');
    expectTypeOf<
      Result extends { q: string; limit: number; offset: number; includeArchived: boolean } ? true : false
    >().toEqualTypeOf<true>();
  });

  it('handles query params with equals signs in values', () => {
    type Result = ExtractQueryParams<'/users?filter=role=admin&sort=name'>;
    expectTypeOf<Result extends { filter: 'role=admin'; sort: 'name' } ? true : false>().toEqualTypeOf<true>();
  });

  it('handles complex query with mixed static and dynamic params', () => {
    type Result = ExtractQueryParams<'/reports?format=pdf&date=:date&includeSummary=(boolean)&count=(number)'>;

    expectTypeOf<Result>().toHaveProperty('format');
    expectTypeOf<Result>().toHaveProperty('date');
    expectTypeOf<Result>().toHaveProperty('includeSummary');
    expectTypeOf<Result>().toHaveProperty('count');
    expectTypeOf<
      Result extends { format: 'pdf'; date: string; includeSummary: boolean; count: number } ? true : false
    >().toEqualTypeOf<true>();
  });
});