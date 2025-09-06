import { type FC, type FormEventHandler, memo, useCallback, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../Button.js';
import { manualTodoStats, useUpdateStat } from '@lib/stats.js';
import { debugRender } from '@anchor/react';

export const ManualTodoForm: FC<{ onAdd: (text: string) => void }> = memo(({ onAdd }) => {
  const ref = useRef<HTMLFormElement>(null);
  const [newText, setNewText] = useState('');

  const addTodo: FormEventHandler = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (newText.trim()) {
        onAdd(newText);
        setNewText('');
      }
    },
    [newText, onAdd]
  );

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewText(e.target.value);
  }, []);

  debugRender(ref);
  useUpdateStat(() => {
    manualTodoStats.form.value++;
  });

  return (
    <form ref={ref} className="flex gap-3" onSubmit={addTodo}>
      <input
        type="text"
        value={newText}
        onChange={handleTextChange}
        placeholder="Add a new todo..."
        className="anchor-input flex-grow"
      />
      <Button type="submit" disabled={!newText.trim()}>
        <Plus size={16} />
      </Button>
    </form>
  );
});
