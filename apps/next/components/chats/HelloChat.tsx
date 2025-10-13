import type { FormEvent } from 'react';
import { LoaderCircle } from 'lucide-react';
import { CardContent, CardFooter, CardHeader, Input } from '@anchorlib/react-kit/components';

import { FetchStatus } from '@anchorlib/core';
import { useStream, useVariable, view } from '@anchorlib/react';

export const HelloChat = () => {
  const [name] = useVariable('');
  const [state] = useStream('', {
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

  const ChatStream = view(() => {
    if (state.status === FetchStatus.Idle) {
      return <div className={'flex-1 flex flex-col items-center justify-center gap-2'}>It's lonely here 😔</div>;
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
        {state.status === FetchStatus.Error && <div>Error: {state.error?.message}</div>}
        <span>{state.data}</span>
      </div>
    );
  });

  const LoaderBar = view(() => state.status === FetchStatus.Pending && <LoaderCircle className="animate-spin" />);

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
          <Input bind={name} className={'w-full'} placeholder="Enter your name and press Enter" />
        </form>
      </CardFooter>
    </>
  );
};
