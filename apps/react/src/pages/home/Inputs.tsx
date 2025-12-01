import { TextInput } from '@anchorkit/react/components/input/TextInput.js';
import { bind, mutable, setup } from '@anchorlib/react';

export const TextInputs = setup(() => {
  const text = mutable('');

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <TextInput value={bind(text)} type="text" placeholder="Default" />
        <TextInput type="text" placeholder="Error" className="ark-input-error" />
        <TextInput type="text" placeholder="Success" className="ark-input-success" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <TextInput value={bind(text)} type="text" placeholder="Disabled" disabled />
        <TextInput type="text" placeholder="Error Disabled" className="ark-input-error" disabled />
        <TextInput type="text" placeholder="Success Disabled" className="ark-input-success" disabled />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <TextInput value={bind(text)} type="text" placeholder="Small" className="ark-input-sm" />
        <TextInput type="text" placeholder="Normal" />
        <TextInput type="text" placeholder="Large" className="ark-input-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <TextInput value={bind(text)} type="text" placeholder="Small" className="ark-tool-input" />
        <TextInput type="text" placeholder="Small" className="ark-tool-input ark-input-error" />
        <TextInput type="text" placeholder="Small" className="ark-tool-input ark-input-success" />
      </div>
    </>
  );
}, 'TextInputList');
