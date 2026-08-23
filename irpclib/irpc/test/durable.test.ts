import type { StateChange } from '@airlib/core';
import { describe, expect, it, vi } from 'vitest';
import { Durable, type DurableBridge, durable } from '../src/durable.js';

// Mock Durable Object Wrapper to simulate the actual user implementation concern
class Room {
  source = new Durable<{ users: Record<string, any>; settings: { theme: string }; scores: number[] }>({
    users: {},
    settings: { theme: 'light' },
    scores: [],
  });

  async replay(event: StateChange, id: string) {
    this.source.replay(event, id);
  }

  async subscribe(id: string) {
    return this.source.subscribe(id);
  }
}
// Helper to connect a client to the Server Room without manual stream mocking
const createBridge = (room: Room): DurableBridge => ({
  replay: async (event, emitter) => {
    await room.replay(event, emitter);
  },
  subscribe: async (id) => {
    return room.subscribe(id);
  },
});

describe('Durable Objects Synchronization (Behavioral)', () => {
  it('should synchronize initial state when a client connects', async () => {
    const room = new Room();
    room.source.data.settings.theme = 'dark'; // Mutate server state before connection

    const bridge = createBridge(room);
    const client = await durable.from(bridge, 'client-1');

    expect(client.data.settings.theme).toBe('dark');
    expect(client.data.users).toEqual({});

    client.destroy();
  });

  it('should broadcast top-level object additions to all connected clients', async () => {
    const room = new Room();
    const client1 = await durable.from(createBridge(room), 'client-1');
    const client2 = await durable.from(createBridge(room), 'client-2');

    // Client 1 joins the room
    client1.data.users['client-1'] = { name: 'Alice', active: true };

    // Wait for async stream propagation
    await vi.advanceTimersByTimeAsync(50);

    // Server should have the user
    expect(room.source.data.users['client-1']).toEqual({ name: 'Alice', active: true });

    // Client 2 should observe Client 1's arrival
    expect(client2.data.users['client-1']).toEqual({ name: 'Alice', active: true });

    client1.destroy();
    client2.destroy();
  });

  it('should broadcast deep property modifications correctly', async () => {
    const room = new Room();
    room.source.data.users['client-1'] = { name: 'Alice', score: 0 };

    const client1 = await durable.from(createBridge(room), 'client-1');
    const client2 = await durable.from(createBridge(room), 'client-2');

    // Client 1 updates their deep score
    client1.data.users['client-1'].score = 100;

    await vi.advanceTimersByTimeAsync(50);

    expect(room.source.data.users['client-1'].score).toBe(100);
    expect(client2.data.users['client-1'].score).toBe(100);

    client1.destroy();
    client2.destroy();
  });

  it('should broadcast array mutations correctly', async () => {
    const room = new Room();
    const client1 = await durable.from(createBridge(room), 'client-1');
    const client2 = await durable.from(createBridge(room), 'client-2');

    // Client 1 pushes to array
    client1.data.scores.push(10);
    client1.data.scores.push(20);

    await vi.advanceTimersByTimeAsync(50);

    expect(room.source.data.scores).toEqual([10, 20]);
    expect(client2.data.scores).toEqual([10, 20]);

    // Client 2 updates array
    client2.data.scores[0] = 15;

    await vi.advanceTimersByTimeAsync(50);

    expect(room.source.data.scores).toEqual([15, 20]);
    expect(client1.data.scores).toEqual([15, 20]);

    client1.destroy();
    client2.destroy();
  });

  it('should not echo mutations back to the emitting client', async () => {
    const room = new Room();
    const bridge = createBridge(room);

    // Spy on bridge replay to track network emissions
    const replaySpy = vi.spyOn(bridge, 'replay');

    const client1 = await durable.from(bridge, 'client-1');
    const client2 = await durable.from(createBridge(room), 'client-2');

    // Client 1 mutates
    client1.data.settings.theme = 'blue';

    await vi.advanceTimersByTimeAsync(50);

    // Client 1 emitted exactly once to the server
    expect(replaySpy).toHaveBeenCalledTimes(1);

    // Ensure Client 2 got it
    expect(client2.data.settings.theme).toBe('blue');

    client1.destroy();
    client2.destroy();
  });

  it('should fail gracefully if the bridge connection is rejected', async () => {
    const brokenBridge: DurableBridge = {
      replay: async () => {},
      subscribe: async () => new Response('Internal Server Error', { status: 500 }),
    };

    const client = await durable.from(brokenBridge, 'client-broken');

    // Should fallback to empty object and not throw
    expect(client.data).toEqual({});
    expect(() => client.destroy()).not.toThrow();
  });

  it('should cleanly unsubscribe and close streams upon destruction', async () => {
    const room = new Room();
    const client = await durable.from(createBridge(room), 'client-1');

    // Should not throw when destroying
    expect(() => client.destroy()).not.toThrow();

    // After destruction, local mutations should no longer broadcast over the bridge
    client.data.settings.theme = 'destroyed';

    await vi.advanceTimersByTimeAsync(50);

    // Server should not have received the mutation
    expect(room.source.data.settings.theme).toBe('light');
  });

  it('should create a Durable instance using the factory function', () => {
    const inst = durable({ test: 123 });
    expect(inst.data.test).toBe(123);
  });

  it('should support custom server-side subscribe handlers and cleanly destroy', () => {
    const inst = new Durable({ test: 0 });
    const handler = vi.fn();

    // Subscribe with custom handler
    inst.subscribe('server-client', handler);

    // Replay should trigger the handler
    inst.replay({ type: 'set', keys: ['data', 'test'], value: 1 } as any, 'another-client');
    expect(handler).toHaveBeenCalledTimes(1);

    // Should not trigger if emitter matches
    inst.replay({ type: 'set', keys: ['data', 'test'], value: 2 } as any, 'server-client');
    expect(handler).toHaveBeenCalledTimes(1);

    // Destroy should clean up
    inst.destroy();

    // After destroy, handlers shouldn't be called
    inst.replay({ type: 'set', keys: ['data', 'test'], value: 3 } as any, 'another-client');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should ignore malformed JSON chunks gracefully', async () => {
    let writer: WritableStreamDefaultWriter<Uint8Array>;
    const badBridge: DurableBridge = {
      replay: async () => {},
      subscribe: async () => {
        const { readable, writable } = new TransformStream();
        writer = writable.getWriter();

        // Send valid init
        writer.write(
          new TextEncoder().encode(JSON.stringify({ type: 'init', keys: [], value: { valid: true } }) + '\n')
        );

        return new Response(readable);
      },
    };

    const client = await durable.from(badBridge, 'bad-json');
    expect(client.data.valid).toBe(true);

    // Send bad chunk (should be caught by the catch block and filtered out)
    await writer!.write(new TextEncoder().encode('{ bad_json_no_quotes \n'));

    // Send valid chunk to verify the stream is still alive and processes correctly
    await writer!.write(
      new TextEncoder().encode(JSON.stringify({ type: 'set', keys: ['data', 'valid'], value: false }) + '\n')
    );

    await vi.advanceTimersByTimeAsync(50);
    expect(client.data.valid).toBe(false);

    client.destroy();
  });

  it('should create a Durable instance using the factory function', () => {
    const inst = durable({ test: 123 });
    expect(inst.data.test).toBe(123);
  });

  it('should support custom server-side subscribe handlers and cleanly destroy', () => {
    const inst = new Durable({ test: 0 });
    const handler = vi.fn();

    // Subscribe with custom handler
    inst.subscribe('server-client', handler);

    // Replay should trigger the handler
    inst.replay({ type: 'set', keys: ['data', 'test'], value: 1 } as any, 'another-client');
    expect(handler).toHaveBeenCalledTimes(1);

    // Should not trigger if emitter matches
    inst.replay({ type: 'set', keys: ['data', 'test'], value: 2 } as any, 'server-client');
    expect(handler).toHaveBeenCalledTimes(1);

    // Destroy should clean up
    inst.destroy();

    // After destroy, handlers shouldn't be called
    inst.replay({ type: 'set', keys: ['data', 'test'], value: 3 } as any, 'another-client');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should ignore malformed JSON chunks gracefully', async () => {
    let writer: WritableStreamDefaultWriter<Uint8Array>;
    const badBridge: DurableBridge = {
      replay: async () => {},
      subscribe: async () => {
        const { readable, writable } = new TransformStream();
        writer = writable.getWriter();

        // Send valid init
        writer.write(
          new TextEncoder().encode(JSON.stringify({ type: 'init', keys: [], value: { valid: true } }) + '\n')
        );

        return new Response(readable);
      },
    };

    const client = await durable.from(badBridge, 'bad-json');
    expect(client.data.valid).toBe(true);

    // Send bad chunk (should be caught by the catch block and filtered out)
    await writer!.write(new TextEncoder().encode('{ bad_json_no_quotes \n'));

    // Send valid chunk to verify the stream is still alive and processes correctly
    await writer!.write(
      new TextEncoder().encode(JSON.stringify({ type: 'set', keys: ['data', 'valid'], value: false }) + '\n')
    );

    await vi.advanceTimersByTimeAsync(50);
    expect(client.data.valid).toBe(false);

    client.destroy();
  });

  it('should broadcast array pop, shift, and splice mutations correctly', async () => {
    const room = new Room();
    room.source.data.scores = [1, 2, 3, 4, 5];
    const client1 = await durable.from(createBridge(room), 'client-1');
    const client2 = await durable.from(createBridge(room), 'client-2');

    // Client 1 mutates using various array methods
    client1.data.scores.pop();
    client1.data.scores.shift();
    client1.data.scores.splice(1, 1, 99);

    await vi.advanceTimersByTimeAsync(50);

    // [1, 2, 3, 4, 5] -> pop -> [1, 2, 3, 4] -> shift -> [2, 3, 4] -> splice(1,1,99) -> [2, 99, 4]
    expect(room.source.data.scores).toEqual([2, 99, 4]);
    expect(client2.data.scores).toEqual([2, 99, 4]);

    client1.destroy();
    client2.destroy();
  });

  it('should allow entirely replacing nested object references', async () => {
    const room = new Room();
    const client1 = await durable.from(createBridge(room), 'client-1');
    const client2 = await durable.from(createBridge(room), 'client-2');

    client1.data.users['test-user'] = { name: 'Bob', active: false };

    await vi.advanceTimersByTimeAsync(50);

    // Replace the entire object reference from another client
    client2.data.users['test-user'] = { name: 'Alice', active: true, role: 'admin' };

    await vi.advanceTimersByTimeAsync(50);

    expect(room.source.data.users['test-user']).toEqual({ name: 'Alice', active: true, role: 'admin' });
    expect(client1.data.users['test-user']).toEqual({ name: 'Alice', active: true, role: 'admin' });

    client1.destroy();
    client2.destroy();
  });

  it('should broadcast rapid batched updates smoothly without stream fragmentation', async () => {
    const room = new Room();
    const client1 = await durable.from(createBridge(room), 'client-1');
    const client2 = await durable.from(createBridge(room), 'client-2');

    // Fire off 10 rapid synchronous updates
    for (let i = 0; i < 10; i++) {
      client1.data.scores.push(i);
    }

    await vi.advanceTimersByTimeAsync(50);

    expect(room.source.data.scores).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(client2.data.scores).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

    client1.destroy();
    client2.destroy();
  });
  it('should return the cached Durable instance if requested with the same ID', async () => {
    const room = new Room();

    // First connection
    const client1 = await durable.from(createBridge(room), 'shared-id');

    // Second connection with the same ID
    const client2 = await durable.from(createBridge(room), 'shared-id');

    // Should be exactly the same instance in memory
    expect(client1).toBe(client2);

    // Since they are the same, one destroy cleans up both references (and the registry)
    client1.destroy();
  });

  it('should remove the instance from the registry upon destruction', async () => {
    const room = new Room();

    // Connect and immediately destroy
    const client1 = await durable.from(createBridge(room), 'destroy-id');
    client1.destroy();

    // Re-connect with the same ID
    const client2 = await durable.from(createBridge(room), 'destroy-id');

    // Because it was destroyed, it should be a brand new instance
    expect(client1).not.toBe(client2);

    client2.destroy();
  });

  it('should synchronize a temporal chat room with 5 concurrent users seamlessly', async () => {
    type TemporalUser = { id: string; x: number; y: number; message: string };
    type TemporalChat = { users: Record<string, TemporalUser> };

    const serverRoom = new Durable<TemporalChat>({ users: {} });
    const bridge: DurableBridge = {
      replay: async (event, emitter) => serverRoom.replay(event, emitter),
      subscribe: async (id) => serverRoom.subscribe(id),
    };

    // Spawn 5 clients
    const clients = await Promise.all(
      Array.from({ length: 5 }).map((_, idx) => durable.from<TemporalChat>(bridge, `client-${idx + 1}`))
    );

    // All users join and set initial positions
    clients.forEach((client, idx) => {
      const userId = `user-${idx + 1}`;
      client.data.users[userId] = { id: userId, x: idx * 10, y: idx * 20, message: '' };
    });

    await vi.advanceTimersByTimeAsync(50);

    // Verify all 5 users joined on the server
    expect(Object.keys(serverRoom.data.users).length).toBe(5);

    // Verify a random client has all 5 users synced
    expect(Object.keys(clients[2].data.users).length).toBe(5);

    // Client 1 sends a temporal message
    const sender = clients[0];
    sender.data.users['user-1'].message = 'Hello World!';

    // Disappear after 3000ms
    setTimeout(() => {
      sender.data.users['user-1'].message = '';
    }, 3000);

    await vi.advanceTimersByTimeAsync(50);

    // Everyone (including server) should see the message instantly
    expect(serverRoom.data.users['user-1'].message).toBe('Hello World!');
    expect(clients[4].data.users['user-1'].message).toBe('Hello World!');

    // Advance 3000ms to trigger the timeout
    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(50); // flush stream

    // The message should have faded away on all clients and the server
    expect(serverRoom.data.users['user-1'].message).toBe('');
    expect(clients[2].data.users['user-1'].message).toBe('');
    expect(clients[4].data.users['user-1'].message).toBe('');

    clients.forEach((c) => c.destroy());
  });
});

describe('Durable Adapter Utilities', () => {
  type ChatRoom = {
    users: string[];
    messages: { user: string; text: string }[];
  };

  // Server-side Central DO instance
  const serverRoom = new Durable<ChatRoom>({ users: [], messages: [] });

  // Simulate the CF DO RPC Bridge stub
  const chatRoomBridge: DurableBridge = {
    replay: async (event, emitter) => serverRoom.replay(event, emitter),
    subscribe: async (id) => serverRoom.subscribe(id),
  };

  // Configure the environment adapter globally
  durable.use({
    get: (roomId) => {
      // In a real app, this maps the roomId to the CF DO Binding and returns the RPC stub
      if (roomId.startsWith('room-')) return chatRoomBridge;
      throw new Error(`Unknown DO instance: ${roomId}`);
    },
  });

  it('should synchronize a ChatRoom DO for a specific user using the configured adapter', async () => {
    const user = { id: 'user-123' };
    const roomId = 'room-alpha';

    // Real-world edge usage: Sync the room for this specific user
    const client = await durable.get<ChatRoom>(user.id, roomId);

    // Mutate the state seamlessly at the edge node
    client.data.messages.push({ user: user.id, text: 'Hello from the edge node!' });

    // Wait for the async sync to flush
    await vi.advanceTimersByTimeAsync(50);

    // Verify the central DO node received the chat message
    expect(serverRoom.data.messages).toEqual([{ user: 'user-123', text: 'Hello from the edge node!' }]);

    client.destroy();
  });

  it('should throw an error if durable.get() is called before the adapter is configured', () => {
    durable.use(undefined as any);
    expect(() => durable.get('user-123', 'room-alpha')).toThrow(
      'No durable adapter is provided. Please use durable.use(adapter).'
    );
  });
});

describe('Durable Utilities', () => {
  it('should create Durable instance with default empty object init', () => {
    const d = new Durable();
    expect(d.data).toEqual({});
  });

  it('should generate properly formatted keys using durable.key()', () => {
    expect(durable.key()).toMatch(/^global:\/\//);
    expect(durable.key('123')).toBe('global://123');
    expect(durable.key('123', 'room')).toBe('room://123');
  });

  it('should generate standard uuids using durable.uuid()', () => {
    const uuid = durable.uuid();
    // Verify it generates a standard v4 format UUID without a namespace
    expect(uuid).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
  });

  it('should resolve durable.get() with registered adapter and default namespace', () => {
    const mockBridge = {
      subscribe: vi.fn().mockResolvedValue(new Response(new Uint8Array())),
    };
    const mockAdapter = {
      get: vi.fn().mockReturnValue(mockBridge),
    };

    durable.use(mockAdapter as any);
    const state = durable.get('test-id');
    expect(mockAdapter.get).toHaveBeenCalledWith('global', undefined);
    expect(state).toBeDefined();
  });

  it('should handle multi-chunk stream reader in durable.from', async () => {
    let readCount = 0;
    const stream = new ReadableStream({
      pull(controller) {
        readCount++;
        if (readCount === 1) {
          controller.enqueue(new Uint8Array());
        } else {
          controller.close();
        }
      },
    });
    const response = new Response(stream);
    const mockBridge = {
      subscribe: vi.fn().mockResolvedValue(response),
    };

    const state = await durable.from(mockBridge as any, 'global://multi-chunk');
    expect(state).toBeDefined();
  });
});
