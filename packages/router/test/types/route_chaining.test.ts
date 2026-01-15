import { describe, expectTypeOf, it } from 'vitest';
import { route } from '../../src/index.js';

describe('route.route() chaining', () => {
  it('creates child route with inherited parent params', () => {
    const users = route('/users');
    const userProfile = users.route('/:id');

    // Child should have its own params
    expectTypeOf(userProfile.path).toEqualTypeOf<'/users/:id'>();
    expectTypeOf(userProfile).toBeCallableWith({ id: '123' });
  });

  it('merges parent and child params', () => {
    const users = route('/users');
    const userProfile = users.route('/:userId');
    const userPost = userProfile.route('/posts/:postId');

    // Should require both userId and postId
    expectTypeOf(userPost.path).toEqualTypeOf<'/users/:userId/posts/:postId'>();
    expectTypeOf(userPost).toBeCallableWith({ userId: '123', postId: '456' });
    expectTypeOf(userPost).toBeCallableWith({ userId: '123', postId: '456' });
  });

  it('deeply nested routes accumulate all params', () => {
    const app = route('/');
    const org = app.route('/orgs/:orgId');
    const team = org.route('/teams/:teamId');
    const member = team.route('/members/:memberId');

    // Should require all three params
    expectTypeOf(member).toBeCallableWith({
      orgId: 'org1',
      teamId: 'team1',
      memberId: 'member1',
    });
  });
});