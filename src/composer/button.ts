export enum Button {
  Left = 0,
  Middle = 1,
  Right = 2,
}

export function isLeftClick(e: MouseEvent | TouchEvent) {
  if (e instanceof MouseEvent) {
    return e.button === Button.Left;
  } else if (e instanceof TouchEvent) {
    return e.touches.length === 1;
  }

  return false;
}

export function isMiddleClick(e: MouseEvent | TouchEvent) {
  if (e instanceof MouseEvent) {
    return e.button === Button.Middle;
  } else if (e instanceof TouchEvent) {
    return e.touches.length === 2;
  }

  return false;
}

export function isRightClick(e: MouseEvent | TouchEvent) {
  if (e instanceof MouseEvent) {
    return e.button === Button.Right;
  } else if (e instanceof TouchEvent) {
    return e.touches.length === 3;
  }

  return false;
}
