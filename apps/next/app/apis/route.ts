import { FetchStatus, streamState } from '@anchorlib/core';

export async function GET() {
  const messages = 'Hello, world! Welcome to the one line magic of Anchor!'.split('');
  const [state, stream] = streamState.readable('');

  const enqueue = () => {
    const char = messages.shift();

    if (char) {
      state.data = char;
      setTimeout(enqueue, Math.random() * 50);
    } else {
      state.status = FetchStatus.Success;
    }
  };

  enqueue();

  return new Response(stream, { status: 200 });
}
