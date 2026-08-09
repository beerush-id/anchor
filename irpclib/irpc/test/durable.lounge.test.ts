import type { StateChange } from '@anchorlib/core';
import { describe, expect, it, vi } from 'vitest';
import { Durable, type DurableBridge, type DurableState, durable } from '../src/durable.js';

// ---------------------------------------------------------------------------
// One evening at the Temporal Lounge, told as snapshots.
//
// The lounge data IS the room: a plain object of users. Each test is one
// moment in the evening: the clock is advanced to that moment, the next thing
// happens (someone arrives, greets, moves, follows, fades away, leaves), and
// the room is inspected. After every single event, every connected screen
// must show exactly the same room as the server.
//
//   t=0    john arrives             t=11.5  alice follows john's cursor
//   t=2    alice arrives            t=12.5  bob answers alice
//   t=3.5  alice greets john        t=13    alice's greeting to bob fades
//   t=5    john answers alice       t=15    clara & daniel arrive
//   t=6.5  alice's greeting fades   t=16    clara greets daniel
//   t=8    bob arrives              t=19    every word fades on time
//   t=9.5  john moves               t=20    alice says goodbye and leaves
//   t=10   alice greets bob         t=22-26 the rest leave, one by one
// ---------------------------------------------------------------------------

type TemporalUser = {
  id: string;
  name: string;
  cursor: { x: number; y: number };
  message: string;
};

// The room itself: user id -> user.
type LoungeState = Record<string, TemporalUser>;

type PendingMessage = { text: string; deadline: number; timer: ReturnType<typeof setTimeout> };

// How much fake clock time to advance so stream propagation settles.
const FLUSH = 50;

// The Durable Object hosting the lounge — the server-side source of truth.
class Lounge {
  source = new Durable<LoungeState>({});

  get data() {
    return this.source.data;
  }

  async replay(event: StateChange, emitter: string) {
    this.source.replay(event, emitter);
  }

  async subscribe(id: string) {
    return this.source.subscribe(id);
  }
}

const bridgeFor = (lounge: Lounge): DurableBridge => ({
  replay: (event, emitter) => lounge.replay(event, emitter),
  subscribe: (id) => lounge.subscribe(id),
});

// Deep-compare every connected client against the server's source of truth.
const expectSynced = (lounge: Lounge, clients: DurableState<LoungeState>[]) => {
  for (const client of clients) {
    expect(client.data).toEqual(lounge.data);
  }
};

describe('Temporal Lounge', () => {
  const lounge = new Lounge();
  const bridge = bridgeFor(lounge);
  const clients = new Map<string, DurableState<LoungeState>>();
  const pending = new Map<string, PendingMessage>();
  let storyNow = 0;

  // Advance the evening to a given moment. Each test restarts the fake clock
  // at 0, so any message whose TTL has not elapsed yet is re-armed from its
  // stored deadline before time moves on.
  const passTime = async (to: number) => {
    for (const [id, p] of pending) {
      clearTimeout(p.timer);
      if (p.deadline > storyNow) {
        p.timer = setTimeout(() => {
          const user = clients.get(id)?.data[id];
          if (user) user.message = '';
        }, p.deadline - storyNow);
      }
    }
    await vi.advanceTimersByTimeAsync(to - storyNow);
    storyNow = to;
    await vi.advanceTimersByTimeAsync(FLUSH);
    storyNow += FLUSH;
  };

  // Let a change propagate to the whole party.
  const settle = async () => {
    await vi.advanceTimersByTimeAsync(FLUSH);
    storyNow += FLUSH;
  };

  it('should assert john is the first visitor', async () => {
    // John walks in at opening time and takes a spot.
    const john = await durable.from<LoungeState>(bridge, 'john');
    john.data.john = { id: 'john', name: 'John', cursor: { x: 120, y: 160 }, message: '' };
    clients.set('john', john);

    await settle();

    expect(Object.keys(lounge.data)).toEqual(['john']);
    expectSynced(lounge, [...clients.values()]);
  });

  it('should assert alice joins and both screens show john and alice', async () => {
    await passTime(2000);

    const alice = await durable.from<LoungeState>(bridge, 'alice');
    alice.data.alice = { id: 'alice', name: 'Alice', cursor: { x: 640, y: 480 }, message: '' };
    clients.set('alice', alice);

    await settle();

    // John sees Alice walk in; Alice saw the room as it was when she connected.
    expect(clients.get('john')!.data.alice.name).toBe('Alice');
    expect(clients.get('alice')!.data.john.name).toBe('John');
    expect(Object.keys(lounge.data)).toEqual(['john', 'alice']);
    expectSynced(lounge, [...clients.values()]);
  });

  it('should assert alice greets john and everyone sees it', async () => {
    await passTime(3500);

    const alice = clients.get('alice')!;
    alice.data.alice.message = 'hi john!';
    const timer = setTimeout(() => {
      const user = alice.data.alice;
      if (user) user.message = '';
    }, 3000);
    pending.set('alice', { text: 'hi john!', deadline: storyNow + 3000, timer });

    await settle();

    expect(lounge.data.alice.message).toBe('hi john!');
    expect(clients.get('john')!.data.alice.message).toBe('hi john!');
    expectSynced(lounge, [...clients.values()]);
  });

  it('should assert john answers alice', async () => {
    await passTime(5000);

    const john = clients.get('john')!;
    john.data.john.message = 'hi alice!';
    const timer = setTimeout(() => {
      const user = john.data.john;
      if (user) user.message = '';
    }, 4500);
    pending.set('john', { text: 'hi alice!', deadline: storyNow + 4500, timer });

    await settle();

    expect(lounge.data.john.message).toBe('hi alice!');
    expect(clients.get('alice')!.data.john.message).toBe('hi alice!');
    expectSynced(lounge, [...clients.values()]);
  });

  it("should assert alice's greeting fades exactly at its ttl", async () => {
    await passTime(6500);

    // Alice's 'hi john!' (ttl 3000, sent at t=3.5s) has elapsed.
    expect(lounge.data.alice.message).toBe('');
    expect(clients.get('john')!.data.alice.message).toBe('');
    // John's answer (ttl 4500, sent at t=5s) is still alive.
    expect(lounge.data.john.message).toBe('hi alice!');
    expectSynced(lounge, [...clients.values()]);
  });

  it('should assert bob joins and the room shows all three', async () => {
    await passTime(8000);

    const bob = await durable.from<LoungeState>(bridge, 'bob');
    bob.data.bob = { id: 'bob', name: 'Bob', cursor: { x: 320, y: 260 }, message: '' };
    clients.set('bob', bob);

    await settle();

    expect(Object.keys(lounge.data)).toEqual(['john', 'alice', 'bob']);
    expect(clients.get('john')!.data.bob.name).toBe('Bob');
    expectSynced(lounge, [...clients.values()]);
  });

  it("should assert john moves and everyone sees his new spot", async () => {
    await passTime(9500);

    const john = clients.get('john')!;
    john.data.john.cursor.x = 620;
    john.data.john.cursor.y = 410;

    await settle();

    expect(lounge.data.john.cursor).toEqual({ x: 620, y: 410 });
    expect(clients.get('alice')!.data.john.cursor).toEqual({ x: 620, y: 410 });
    expect(clients.get('bob')!.data.john.cursor).toEqual({ x: 620, y: 410 });
    expectSynced(lounge, [...clients.values()]);
  });

  it('should assert alice greets bob', async () => {
    await passTime(10_000);

    const alice = clients.get('alice')!;
    alice.data.alice.message = 'hi bob!';
    const timer = setTimeout(() => {
      const user = alice.data.alice;
      if (user) user.message = '';
    }, 3000);
    pending.set('alice', { text: 'hi bob!', deadline: storyNow + 3000, timer });

    await settle();

    expect(lounge.data.alice.message).toBe('hi bob!');
    expect(clients.get('bob')!.data.alice.message).toBe('hi bob!');
    expectSynced(lounge, [...clients.values()]);
  });

  it("should assert alice follows john's cursor", async () => {
    await passTime(11_500);

    // Alice saw John's new spot and walks over to him.
    const alice = clients.get('alice')!;
    alice.data.alice.cursor.x = 610;
    alice.data.alice.cursor.y = 420;

    await settle();

    expect(lounge.data.alice.cursor).toEqual({ x: 610, y: 420 });
    expect(clients.get('john')!.data.alice.cursor).toEqual({ x: 610, y: 420 });
    expectSynced(lounge, [...clients.values()]);
  });

  it('should assert bob answers alice', async () => {
    await passTime(12_500);

    const bob = clients.get('bob')!;
    bob.data.bob.message = 'hi alice!';
    const timer = setTimeout(() => {
      const user = bob.data.bob;
      if (user) user.message = '';
    }, 4500);
    pending.set('bob', { text: 'hi alice!', deadline: storyNow + 4500, timer });

    await settle();

    expect(lounge.data.bob.message).toBe('hi alice!');
    expect(clients.get('alice')!.data.bob.message).toBe('hi alice!');
    expectSynced(lounge, [...clients.values()]);
  });

  it("should assert alice's greeting to bob fades while bob's reply stays", async () => {
    await passTime(13_000);

    // Alice's 'hi bob!' (ttl 3000, sent at t=10s) has elapsed.
    expect(lounge.data.alice.message).toBe('');
    expect(clients.get('bob')!.data.alice.message).toBe('');
    // Bob's answer (ttl 4500, sent at t=12.5s) is still alive.
    expect(lounge.data.bob.message).toBe('hi alice!');
    expectSynced(lounge, [...clients.values()]);
  });

  it('should assert clara and daniel join and the room shows all five', async () => {
    await passTime(15_000);

    const clara = await durable.from<LoungeState>(bridge, 'clara');
    clara.data.clara = { id: 'clara', name: 'Clara', cursor: { x: 200, y: 560 }, message: '' };
    clients.set('clara', clara);
    await settle();

    const daniel = await durable.from<LoungeState>(bridge, 'daniel');
    daniel.data.daniel = { id: 'daniel', name: 'Daniel', cursor: { x: 540, y: 120 }, message: '' };
    clients.set('daniel', daniel);
    await settle();

    expect(Object.keys(lounge.data)).toEqual(['john', 'alice', 'bob', 'clara', 'daniel']);
    expect(clients.get('clara')!.data.daniel.name).toBe('Daniel');
    expect(clients.get('daniel')!.data.clara.name).toBe('Clara');
    expectSynced(lounge, [...clients.values()]);
  });

  it('should assert clara greets daniel', async () => {
    await passTime(16_000);

    const clara = clients.get('clara')!;
    clara.data.clara.message = 'hi daniel!';
    const timer = setTimeout(() => {
      const user = clara.data.clara;
      if (user) user.message = '';
    }, 3000);
    pending.set('clara', { text: 'hi daniel!', deadline: storyNow + 3000, timer });

    await settle();

    expect(lounge.data.clara.message).toBe('hi daniel!');
    expect(clients.get('daniel')!.data.clara.message).toBe('hi daniel!');
    expectSynced(lounge, [...clients.values()]);
  });

  it('should assert every word fades on time and the room falls quiet', async () => {
    await passTime(19_000);

    // Bob's reply (t=12.5s + 4.5s) and Clara's greeting (t=16s + 3s) are done.
    expect(lounge.data.bob.message).toBe('');
    expect(lounge.data.clara.message).toBe('');
    for (const client of clients.values()) {
      expect(client.data.bob.message).toBe('');
      expect(client.data.clara.message).toBe('');
    }
    expectSynced(lounge, [...clients.values()]);
  });

  it('should assert alice says goodbye and leaves', async () => {
    await passTime(20_000);

    // Alice says goodbye — it appears everywhere, then she walks out.
    const alice = clients.get('alice')!;
    alice.data.alice.message = 'bye all!';
    await settle();
    expect(lounge.data.alice.message).toBe('bye all!');

    // She leaves: her entry is deleted from every screen and her connection
    // closes. Her last words leave with her.
    clearTimeout(pending.get('alice')?.timer);
    pending.delete('alice');
    delete alice.data.alice;
    alice.destroy();
    clients.delete('alice');

    await settle();

    expect(lounge.data.alice).toBeUndefined();
    expect(clients.get('john')!.data.alice).toBeUndefined();
    expect(Object.keys(lounge.data)).toEqual(['john', 'bob', 'clara', 'daniel']);
    expectSynced(lounge, [...clients.values()]);
  });

  it('should assert bob leaves', async () => {
    await passTime(22_000);

    const bob = clients.get('bob')!;
    delete bob.data.bob;
    bob.destroy();
    clients.delete('bob');

    await settle();

    expect(lounge.data.bob).toBeUndefined();
    expect(Object.keys(lounge.data)).toEqual(['john', 'clara', 'daniel']);
    expectSynced(lounge, [...clients.values()]);
  });

  it('should assert clara and daniel leave', async () => {
    await passTime(24_000);

    for (const id of ['clara', 'daniel']) {
      const client = clients.get(id)!;
      delete client.data[id];
      client.destroy();
      clients.delete(id);
    }

    await settle();

    expect(lounge.data.clara).toBeUndefined();
    expect(lounge.data.daniel).toBeUndefined();
    expect(Object.keys(lounge.data)).toEqual(['john']);
    expectSynced(lounge, [...clients.values()]);
  });

  it('should assert john leaves and the lounge is empty', async () => {
    await passTime(26_000);

    const john = clients.get('john')!;
    delete john.data.john;
    john.destroy();
    clients.delete('john');

    await settle();

    // Closing time: the room is empty and every screen agrees about it.
    expect(lounge.data).toEqual({});
    expectSynced(lounge, [...clients.values()]);
  });
});
