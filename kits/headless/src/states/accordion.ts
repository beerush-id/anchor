import { getContext, mutable, setContext } from '@anchorlib/core';
import { Switch, SwitchGroup, type SwitchGroupInit, type SwitchInit } from '../objects/index.js';

export interface AccordionInit extends SwitchInit {
  expanded?: boolean;
}

export const AccordionCtx = Symbol('Accordion');

export class AccordionState extends Switch {
  public get expanded() {
    return this.checked;
  }

  public set expanded(value: boolean) {
    this.checked = value;
  }
}

export function createAccordion(options?: AccordionInit, group?: AccordionGroup) {
  const item = mutable(new AccordionState(options));

  if (group) {
    group.insert(item);
  }

  return item;
}

export function getAccordion() {
  return getContext<AccordionState>(AccordionCtx);
}

export function setAccordion(item: AccordionState) {
  return setContext(AccordionCtx, item);
}

export const AccordionGroupCtx = Symbol('AccordionGroup');

export interface AccordionGroupInit extends SwitchGroupInit {}

export class AccordionGroup extends SwitchGroup {}

export function createAccordionGroup(options?: AccordionGroupInit) {
  return mutable(new AccordionGroup(options), { recursive: false });
}

export function getAccordionGroup() {
  return getContext<AccordionGroup>(AccordionGroupCtx);
}

export function setAccordionGroup(group: AccordionGroup) {
  return setContext(AccordionGroupCtx, group);
}
