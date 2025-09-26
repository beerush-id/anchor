import { FetchStatus, streamState } from '@anchorlib/core';

export async function GET() {
  const messages = 'Hello, world! Welcome to the one line magic of Anchor!'.split('');

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

  // Begin sending characters.
  enqueue();

  return new Response(stream, { status: 200 });
}
