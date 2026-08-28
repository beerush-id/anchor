import { mutable, Snippet, setup } from '@airlib/react';
import type { SubmitEventHandler } from 'react';
import { temporal } from '@/pages/demos/temporal/function.js';

export interface MessageInputProps {
  userId: string;
}

/**
 * Bottom temporal chat input form with Snippet-isolated reactivity.
 */
export const MessageInput = setup<MessageInputProps>((props) => {
  const form = mutable({ text: '' });

  const submit: SubmitEventHandler = (e) => {
    e.preventDefault();
    const trimmed = form.text.trim();
    if (!trimmed) return;

    temporal.chat({ id: props.userId, message: trimmed });
    form.text = '';
  };

  return (
    <div className="pointer-events-none absolute bottom-6 left-0 right-0 z-20 flex flex-col items-center gap-2 px-4">
      {/* Controls Hint */}
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-slate-800/80 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-400 backdrop-blur-md">
        <span>Use</span>
        <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-300">W</kbd>
        <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-300">A</kbd>
        <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-300">S</kbd>
        <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-300">D</kbd>
        <span>or Arrow keys to move</span>
      </div>

      {/* Chat Form */}
      <form
        onSubmit={submit}
        className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 p-1.5 shadow-2xl backdrop-blur-md"
      >
        <Snippet>
          {() => (
            <input
              type="text"
              value={form.text}
              maxLength={40}
              autoComplete="off"
              placeholder="Say something nearby (lasts 5s)..."
              onChange={(e) => (form.text = e.target.value)}
              className="flex-1 bg-transparent px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none"
            />
          )}
        </Snippet>
        <button
          type="submit"
          className="cursor-pointer rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all hover:bg-sky-400 active:scale-95"
        >
          Send
        </button>
      </form>
    </div>
  );
});
