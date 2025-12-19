import { getContext, mutable, setContext } from '@anchorlib/core';
import { Switch, SwitchGroup, type SwitchGroupInit, type SwitchInit } from '../objects/switch.js';

export interface ButtonSwitchInit extends SwitchInit {}
export interface ButtonGroupInit extends SwitchGroupInit {}

export class ButtonGroup extends SwitchGroup {}
export class ButtonSwitch extends Switch {}

export const ButtonGroupCtx = Symbol('ButtonGroup');

export function createButtonSwitch(options?: ButtonSwitchInit, group?: ButtonGroup) {
  const state = mutable(new ButtonSwitch(options));

  if (group) {
    group.insert(state);
  }

  return state;
}

export function createButtonGroup(options?: ButtonGroupInit) {
  return mutable(new ButtonGroup(options), { recursive: false });
}

export function setButtonGroup(group: ButtonGroup) {
  return setContext(ButtonGroupCtx, group);
}

export function getButtonGroup() {
  return getContext<ButtonGroup>(ButtonGroupCtx);
}
