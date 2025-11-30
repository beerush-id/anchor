'use client';

import { useStream } from '@anchorlib/react-classic';
import { LoaderCircle } from 'lucide-react';
import { view } from '@anchorlib/react-classic/view';
import { FetchStatus } from '@anchorlib/core';

export default function Page() {
  const [state] = useStream('', { url: '/apis/stream', method: 'get' });

  const Hello = view(() => {
    if (state.status === FetchStatus.Idle) {
      return <div>Please wait...</div>;
    }

    return (
      <div className="flex flex-col items-center gap-2">
        {state.status === FetchStatus.Pending && <LoaderCircle className="animate-spin" />}
        {state.status === FetchStatus.Error && <div>Error: {state.error?.message}</div>}
        <span>{state.data}</span>
      </div>
    );
  });

  return (
    <div className="flex flex-col items-center justify-center gap-2 w-screen h-screen">
      <Hello />
    </div>
  );
}
