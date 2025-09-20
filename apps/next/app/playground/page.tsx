'use client';

import { useActions, useVariable } from '@anchorlib/react';
import { useClassName, useStyle } from '@anchorlib/react-kit/actions';
import type { StyleRefs } from '@anchorlib/react-kit/utils';

const redList = ['text-red-500', 'text-red-600', 'text-red-700'];
const colorList = ['red', 'blue', 'green'];

export default function Page() {
  const [className] = useVariable('text-red-500');
  const [styleName] = useVariable<StyleRefs>({
    color: colorList[colorList.length - 1],
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
    </>
  );
}
