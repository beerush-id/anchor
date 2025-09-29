import { FetchStatus, streamState } from '@anchorlib/core';
import { NextRequest } from 'next/server.js';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const messages = `Hello, ${body?.name ?? 'World'}! My name is Anchor. How can I help you today?`.split('');

  // Create a reactive stream state with an initial value of an empty string.
  const [state, stream] = streamState.readable('');

  // Send each character to the stream in a random interval.
  const enqueue = () => {
    const char = messages.shift();

    if (char) {
      // Update the state with the current character.
      state.data = char;
      setTimeout(enqueue, Math.random() * 50);
    } else {
      // Mark the stream as complete.
      state.status = FetchStatus.Success;
    }
  };

  enqueue();

  return new Response(stream, { status: 200 });
}
