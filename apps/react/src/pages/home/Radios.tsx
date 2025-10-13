import { Radio, RadioGroup, RadioLabel } from '@anchorkit/react/components';

export function Radios() {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-2">Radio Group</h2>
      <RadioGroup value={'1'}>
        <RadioLabel>
          <Radio value="1" />
          <span>Option 1</span>
        </RadioLabel>
        <RadioLabel>
          <Radio value="2" />
          <span>Option 2</span>
        </RadioLabel>
        <RadioLabel>
          <Radio value="1" disabled />
          <span>Option 1</span>
        </RadioLabel>
        <RadioLabel>
          <Radio value="2" disabled />
          <span>Option 2</span>
        </RadioLabel>
      </RadioGroup>
    </div>
  );
}
