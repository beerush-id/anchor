import { FetchStatus, mutable, setup, snippet, streamState } from '@anchorlib/react';
import { CardContent, CardFooter, CardHeader } from '@anchorlib/react-kit/components';
import { LoaderCircle } from 'lucide-react';
import type { FormEvent } from 'react';

export const HelloChat = setup(() => {
  const name = mutable('');
  const state = streamState('', {
    url: '/apis/stream',
    method: 'post',
    deferred: true,
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.value || state.status === FetchStatus.Pending) return;

    // Reset the previous message.
    state.data = '';
    // Send new request.
    state.fetch({
      body: JSON.stringify({ name: name.value }),
    });
    // Reset the form input.
    name.value = '';
  };

  const ChatStream = snippet(() => {
    if (state.status === FetchStatus.Idle) {
      return <div className={'flex-1 flex flex-col items-center justify-center gap-2'}>It's lonely here 😔</div>;
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
        {state.status === FetchStatus.Error && <div>Error: {state.error?.message}</div>}
        <span>{state.data}</span>
      </div>
    );
  }, 'ChatStream');

  const LoaderBar = snippet(
    () => state.status === FetchStatus.Pending && <LoaderCircle className="animate-spin" />,
    'LoaderBar'
  );

  const NameInput = snippet(
    () => (
      <input
        value={name.value}
        onChange={(e) => (name.value = e.target.value)}
        className="ark-input w-full"
        placeholder="Enter your name and press Enter"
      />
    ),
    'NameInput'
  );

  return (
    <>
      <CardHeader>
        <h2 className={'flex-1'}>Chat with Anchor</h2>
        <LoaderBar />
      </CardHeader>
      <CardContent className={'p-4 flex-1 flex flex-col'}>
        <ChatStream />
      </CardContent>
      <CardFooter className={'p-4'}>
        <form onSubmit={handleSubmit}>
          <NameInput />
        </form>
      </CardFooter>
    </>
  );
}, 'HelloChat');
