import { TextArea } from '@anchorkit/react/components';
import { $bind, mutable, setup } from '@anchorlib/react';

export const TextAreas = setup(() => {
  const text = mutable('');

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <TextArea value={$bind(text)} placeholder="Default"></TextArea>
        <TextArea value={$bind(text)} placeholder="Default" className="ark-textarea-error"></TextArea>
        <TextArea value={$bind(text)} placeholder="Default" className="ark-textarea-success"></TextArea>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <TextArea value={$bind(text)} placeholder="Default" disabled></TextArea>
        <TextArea value={$bind(text)} placeholder="Default" className="ark-textarea-error" disabled></TextArea>
        <TextArea value={$bind(text)} placeholder="Default" className="ark-textarea-success" disabled></TextArea>
      </div>
    </>
  );
}, 'TextAreaList');
