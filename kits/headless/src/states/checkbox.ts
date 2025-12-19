import { getContext, mutable, setContext } from '@anchorlib/core';
import { Switch, SwitchGroup, type SwitchGroupInit, type SwitchInit } from '../objects/index.js';

export interface CheckboxInit extends SwitchInit {}
export interface CheckboxGroupInit extends SwitchGroupInit {}

export class CheckboxState extends Switch {}
export class CheckboxGroup extends SwitchGroup {}

export const CheckboxGroupCtx = Symbol('CheckboxGroup');

export function createCheckbox(options?: CheckboxInit, group?: CheckboxGroup): CheckboxState {
  const state = mutable(new CheckboxState(options));

  if (group) {
    group.insert(state);
  }

  return state;
}

export function createCheckboxGroup(options?: CheckboxGroupInit): CheckboxGroup {
  return mutable(new CheckboxGroup(options));
}

export function getCheckboxGroup() {
  return getContext<CheckboxGroup>(CheckboxGroupCtx);
}

export function setCheckboxGroup(group: CheckboxGroup) {
  return setContext(CheckboxGroupCtx, group);
}
