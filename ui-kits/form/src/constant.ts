export const FORM_SYMBOL = Symbol('airlib:form');
export const FORM_FIELD_SYMBOL = Symbol('airlib:form-field');
export const FORM_INVALID_INPUT = Symbol('airlib:form-invalid-input');

export const FORM_STATUS = {
  IDLE: 'idle',
  PENDING: 'pending',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export const FORM_INPUT = {
  text: 'text',
  email: 'email',
  url: 'url',
  tel: 'tel',
  password: 'password',
  search: 'search',
  hidden: 'hidden',
  number: 'number',
  range: 'range',
  date: 'date',
  datetimeLocal: 'datetime-local',
  time: 'time',
  month: 'month',
  week: 'week',
  checkbox: 'checkbox',
  radio: 'radio',
  color: 'color',
  toggle: 'toggle',
} as const;
