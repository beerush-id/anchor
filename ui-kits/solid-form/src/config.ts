export const FORM_OPTIONS = {
  class: '',
  errorClass: '',
  pendingClass: '',
  strict: true,
  validateOnInit: true,
  settleOnSubmit: true,
};
export const FORM_OPTIONS_KEYS = Object.keys(FORM_OPTIONS);
export type FormDefaultOptions = Partial<typeof FORM_OPTIONS>;

export const FIELD_OPTIONS = {
  class: '',
  labelClass: '',
  errorClass: '',
  requiredLabel: '*',
  requiredClass: '',
  mismatchLabel: '',
};
export const FIELD_OPTIONS_KEYS = Object.keys(FIELD_OPTIONS);
export type FieldDefaultOptions = Partial<typeof FIELD_OPTIONS>;

export const INPUT_OPTIONS = {
  class: '',
  errorClass: '',
};
export const INPUT_OPTIONS_KEYS = Object.keys(INPUT_OPTIONS);
export type InputDefaultOptions = Partial<typeof INPUT_OPTIONS>;

export const TEXT_INPUT_OPTIONS = {
  class: '',
  errorClass: '',
};
export const TEXT_INPUT_OPTIONS_KEYS = Object.keys(TEXT_INPUT_OPTIONS);
export type TextInputDefaultOptions = Partial<typeof TEXT_INPUT_OPTIONS>;

export const EMAIL_OPTIONS = {
  class: '',
  errorClass: '',
};
export const EMAIL_OPTIONS_KEYS = Object.keys(EMAIL_OPTIONS);
export type EmailDefaultOptions = Partial<typeof EMAIL_OPTIONS>;

export const NUMBER_OPTIONS = {
  class: '',
  errorClass: '',
};
export const NUMBER_OPTIONS_KEYS = Object.keys(NUMBER_OPTIONS);
export type NumberDefaultOptions = Partial<typeof NUMBER_OPTIONS>;

export const PASSWORD_OPTIONS = {
  class: '',
  errorClass: '',
};
export const PASSWORD_OPTIONS_KEYS = Object.keys(PASSWORD_OPTIONS);
export type PasswordDefaultOptions = Partial<typeof PASSWORD_OPTIONS>;

export const CHECKBOX_OPTIONS = {
  class: '',
  errorClass: '',
};
export const CHECKBOX_OPTIONS_KEYS = Object.keys(CHECKBOX_OPTIONS);
export type CheckboxDefaultOptions = Partial<typeof CHECKBOX_OPTIONS>;

export const RADIO_OPTIONS = {
  class: '',
  errorClass: '',
};
export const RADIO_OPTIONS_KEYS = Object.keys(RADIO_OPTIONS);
export type RadioDefaultOptions = Partial<typeof RADIO_OPTIONS>;

export const SLIDER_OPTIONS = {
  class: '',
  errorClass: '',
};
export const SLIDER_OPTIONS_KEYS = Object.keys(SLIDER_OPTIONS);
export type SliderDefaultOptions = Partial<typeof SLIDER_OPTIONS>;

export const SELECT_OPTIONS = {
  class: '',
  errorClass: '',
};
export const SELECT_OPTIONS_KEYS = Object.keys(SELECT_OPTIONS);
export type SelectDefaultOptions = Partial<typeof SELECT_OPTIONS>;

export const TEXTAREA_OPTIONS = {
  class: '',
  errorClass: '',
};
export const TEXTAREA_OPTIONS_KEYS = Object.keys(TEXTAREA_OPTIONS);
export type TextareaDefaultOptions = Partial<typeof TEXTAREA_OPTIONS>;

export const FILE_OPTIONS = {
  class: '',
  errorClass: '',
};
export const FILE_OPTIONS_KEYS = Object.keys(FILE_OPTIONS);
export type FileDefaultOptions = Partial<typeof FILE_OPTIONS>;

export const COLOR_OPTIONS = {
  class: '',
  errorClass: '',
};
export const COLOR_OPTIONS_KEYS = Object.keys(COLOR_OPTIONS);
export type ColorDefaultOptions = Partial<typeof COLOR_OPTIONS>;

export const DATE_OPTIONS = {
  class: '',
  errorClass: '',
};
export const DATE_OPTIONS_KEYS = Object.keys(DATE_OPTIONS);
export type DateDefaultOptions = Partial<typeof DATE_OPTIONS>;

export const TIME_OPTIONS = {
  class: '',
  errorClass: '',
};
export const TIME_OPTIONS_KEYS = Object.keys(TIME_OPTIONS);
export type TimeDefaultOptions = Partial<typeof TIME_OPTIONS>;

export const DATETIME_OPTIONS = {
  class: '',
  errorClass: '',
};
export const DATETIME_OPTIONS_KEYS = Object.keys(DATETIME_OPTIONS);
export type DatetimeDefaultOptions = Partial<typeof DATETIME_OPTIONS>;

export const RESET_OPTIONS = {
  class: '',
  dirtyClass: '',
};
export const RESET_OPTIONS_KEYS = Object.keys(RESET_OPTIONS);
export type ResetDefaultOptions = Partial<typeof RESET_OPTIONS>;

export const SUBMIT_OPTIONS = {
  class: '',
  pendingClass: '',
};
export const SUBMIT_OPTIONS_KEYS = Object.keys(SUBMIT_OPTIONS);
export type SubmitDefaultOptions = Partial<typeof SUBMIT_OPTIONS>;

export type FormGeneralOptions = {
  form?: FormDefaultOptions;
  field?: FieldDefaultOptions;
  input?: InputDefaultOptions;
  textInput?: TextInputDefaultOptions;
  email?: EmailDefaultOptions;
  number?: NumberDefaultOptions;
  password?: PasswordDefaultOptions;
  checkbox?: CheckboxDefaultOptions;
  radio?: RadioDefaultOptions;
  slider?: SliderDefaultOptions;
  select?: SelectDefaultOptions;
  textarea?: TextareaDefaultOptions;
  file?: FileDefaultOptions;
  color?: ColorDefaultOptions;
  date?: DateDefaultOptions;
  time?: TimeDefaultOptions;
  datetime?: DatetimeDefaultOptions;
  reset?: ResetDefaultOptions;
  submit?: SubmitDefaultOptions;
};

export function configureForm(options: FormGeneralOptions) {
  Object.assign(FORM_OPTIONS, options.form ?? {});
  Object.assign(FIELD_OPTIONS, options.field ?? {});
  Object.assign(INPUT_OPTIONS, options.input ?? {});
  Object.assign(TEXT_INPUT_OPTIONS, options.textInput ?? {});
  Object.assign(EMAIL_OPTIONS, options.email ?? {});
  Object.assign(NUMBER_OPTIONS, options.number ?? {});
  Object.assign(PASSWORD_OPTIONS, options.password ?? {});
  Object.assign(CHECKBOX_OPTIONS, options.checkbox ?? {});
  Object.assign(RADIO_OPTIONS, options.radio ?? {});
  Object.assign(SLIDER_OPTIONS, options.slider ?? {});
  Object.assign(SELECT_OPTIONS, options.select ?? {});
  Object.assign(TEXTAREA_OPTIONS, options.textarea ?? {});
  Object.assign(FILE_OPTIONS, options.file ?? {});
  Object.assign(COLOR_OPTIONS, options.color ?? {});
  Object.assign(DATE_OPTIONS, options.date ?? {});
  Object.assign(TIME_OPTIONS, options.time ?? {});
  Object.assign(DATETIME_OPTIONS, options.datetime ?? {});
  Object.assign(RESET_OPTIONS, options.reset ?? {});
  Object.assign(SUBMIT_OPTIONS, options.submit ?? {});
}

export function getInputClasses(specificOptions?: { class?: string; errorClass?: string }) {
  return {
    baseClass: [INPUT_OPTIONS.class, specificOptions?.class].filter(Boolean).join(' '),
    errorClass: [INPUT_OPTIONS.errorClass, specificOptions?.errorClass].filter(Boolean).join(' '),
  };
}

const TEXT_TYPES = new Set(['text', 'search', 'tel', 'url']);

export function getSpecificOptions(type: string) {
  switch (type) {
    case 'email':
      return { options: EMAIL_OPTIONS, keys: EMAIL_OPTIONS_KEYS };
    case 'number':
      return { options: NUMBER_OPTIONS, keys: NUMBER_OPTIONS_KEYS };
    case 'password':
      return { options: PASSWORD_OPTIONS, keys: PASSWORD_OPTIONS_KEYS };
    case 'range':
      return { options: SLIDER_OPTIONS, keys: SLIDER_OPTIONS_KEYS };
    case 'color':
      return { options: COLOR_OPTIONS, keys: COLOR_OPTIONS_KEYS };
    case 'date':
      return { options: DATE_OPTIONS, keys: DATE_OPTIONS_KEYS };
    case 'time':
      return { options: TIME_OPTIONS, keys: TIME_OPTIONS_KEYS };
    case 'datetime-local':
      return { options: DATETIME_OPTIONS, keys: DATETIME_OPTIONS_KEYS };
    default:
      if (TEXT_TYPES.has(type)) {
        return { options: TEXT_INPUT_OPTIONS, keys: TEXT_INPUT_OPTIONS_KEYS };
      }
      return { options: null, keys: [] as string[] };
  }
}
