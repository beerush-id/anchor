'use client';

import { useActions, useAnchor, useVariable } from '@anchorlib/react';
import { useClassName, useStyle } from '@anchorlib/react-kit/actions';
import type { StyleDeclaration } from '@anchorlib/react-kit';
import { observe } from '@anchorlib/react/view';
import { Input } from '@anchorlib/react-kit/components';
import { optimized } from '@anchorlib/react-kit/view';
import type { HTMLAttributes } from 'react';

const redList = ['text-red-500', 'text-red-600', 'text-red-700'];
const colorList = ['red', 'blue', 'green'];

const Span = optimized<HTMLAttributes<HTMLSpanElement>>(({ children, ...props }) => <span {...props}>{children}</span>);

export default function Page() {
  const [className] = useVariable('text-red-500');
  const [styleName] = useVariable<StyleDeclaration>({
    color: colorList[colorList.length - 1],
    display: 'flex',
  });

  const circleClass = () => {
    const color = redList.shift() as string;
    className.value = color;
    redList.push(color);
  };

  const circleColor = () => {
    const color = colorList.shift() as string;
    styleName.value.color = color;
    colorList.push(color);
    circleClass();
  };

  return (
    <>
      <div ref={useActions(useClassName(className), useStyle(styleName))} className={className.value}>
        Hello, world!
      </div>
      <button onClick={circleColor}>Change Color</button>
      <NameForm />
    </>
  );
}

const NameForm = () => {
  const [state] = useAnchor({
    firstName: '',
    lastName: '',
    get fullName() {
      return (this.firstName + ' ' + this.lastName).trim();
    },
  });

  const FullName = observe(() => <span>{state.fullName || 'Unknown'}</span>);

  return (
    <div className="flex flex-col">
      <FullName />
      <Span>{state.fullName || 'Unknown'}</Span>
      <Input bind={state} name={'firstName'} placeholder={'First Name'} />
      <Input bind={state} name={'lastName'} placeholder={'Last Name'} />
    </div>
  );
};
