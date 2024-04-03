import { anchor, Readable, Rec, State, Unsubscribe } from '../core/index.js';
import { entries, NestedPath, NestedPathValue, read, write } from '../utils/index.js';
import { ItemTypeOf, Part } from '../core/base.js';
import { cookie } from '../store/index.js';

export enum Locale {
  AFRIKAANS = 'af',
  ARABIC = 'ar',
  BENGALI = 'bn',
  BULGARIAN = 'bg',
  CATALAN = 'ca',
  CHINESE_SIMPLIFIED = 'zh-CN',
  CHINESE_TRADITIONAL = 'zh-TW',
  CROATIAN = 'hr',
  CZECH = 'cs',
  DANISH = 'da',
  DUTCH = 'nl',
  ENGLISH = 'en',
  ESTONIAN = 'et',
  FILIPINO = 'fil',
  FINNISH = 'fi',
  FRENCH = 'fr',
  GERMAN = 'de',
  GREEK = 'el',
  GUJARATI = 'gu',
  HEBREW = 'he',
  HINDI = 'hi',
  HUNGARIAN = 'hu',
  ICELANDIC = 'is',
  INDONESIAN = 'id',
  ITALIAN = 'it',
  JAPANESE = 'ja',
  KANNADA = 'kn',
  KOREAN = 'ko',
  LATVIAN = 'lv',
  LITHUANIAN = 'lt',
  MALAY = 'ms',
  MALAYALAM = 'ml',
  MARATHI = 'mr',
  NORWEGIAN = 'no',
  PERSIAN = 'fa',
  POLISH = 'pl',
  PORTUGUESE = 'pt',
  PUNJABI = 'pa',
  ROMANIAN = 'ro',
  RUSSIAN = 'ru',
  SERBIAN = 'sr',
  SLOVAK = 'sk',
  SLOVENIAN = 'sl',
  SPANISH = 'es',
  SWAHILI = 'sw',
  SWEDISH = 'sv',
  TAMIL = 'ta',
  TELUGU = 'te',
  THAI = 'th',
  TURKISH = 'tr',
  UKRAINIAN = 'uk',
  URDU = 'ur',
  VIETNAMESE = 'vi',
  WELSH = 'cy',
  XHOSA = 'xh',
  ZULU = 'zu',
}

export type Locales = Array<{
  name: Locale;
  label: string;
  description?: string;
}>;

export type Definitions = {
  [key: string]: string | Definitions;
};

export type SimpleDefinitions = {
  [key: string]: string;
};

export type Translation<T extends Definitions> = {
  name: string;
  locale: Locale;
  description: string;
  version: string;
  definitions: T;
};

export type SpeakParams = {
  [key: string]: string | number | boolean | Date;
};

type Speaker<T extends Definitions> = <P extends NestedPath<T>>(key: P, params?: SpeakParams) => string;

export type TranslatorFactory<T extends Definitions = SimpleDefinitions> = ((
  baseURL?: string,
  translation?: Translation<T>
) => [Speaker<T>, Translator<T>]) & {
  global: Translator<T>;
};

export const LOCALES: Locales = [
  {
    name: Locale.AFRIKAANS,
    label: 'Afrikaans',
  },
  {
    name: Locale.ARABIC,
    label: 'Arabic',
  },
  {
    name: Locale.BENGALI,
    label: 'Bengali',
  },
  {
    name: Locale.BULGARIAN,
    label: 'Bulgarian',
  },
  {
    name: Locale.CATALAN,
    label: 'Catalan',
  },
  {
    name: Locale.CHINESE_SIMPLIFIED,
    label: 'Chinese (Simplified)',
  },
  {
    name: Locale.CHINESE_TRADITIONAL,
    label: 'Chinese (Traditional)',
  },
  {
    name: Locale.CROATIAN,
    label: 'Croatian',
  },
  {
    name: Locale.CZECH,
    label: 'Czech',
  },
  {
    name: Locale.DANISH,
    label: 'Danish',
  },
  {
    name: Locale.DUTCH,
    label: 'Dutch',
  },
  {
    name: Locale.ENGLISH,
    label: 'English',
  },
  {
    name: Locale.ESTONIAN,
    label: 'Estonian',
  },
  {
    name: Locale.FILIPINO,
    label: 'Filipino',
  },
  {
    name: Locale.FINNISH,
    label: 'Finnish',
  },
  {
    name: Locale.FRENCH,
    label: 'French',
  },
  {
    name: Locale.GERMAN,
    label: 'German',
  },
  {
    name: Locale.GREEK,
    label: 'Greek',
  },
  {
    name: Locale.GUJARATI,
    label: 'Gujarati',
  },
  {
    name: Locale.HEBREW,
    label: 'Hebrew',
  },
  {
    name: Locale.HINDI,
    label: 'Hindi',
  },
  {
    name: Locale.HUNGARIAN,
    label: 'Hungarian',
  },
  {
    name: Locale.ICELANDIC,
    label: 'Icelandic',
  },
  {
    name: Locale.INDONESIAN,
    label: 'Indonesian',
  },
  {
    name: Locale.ITALIAN,
    label: 'Italian',
  },
  {
    name: Locale.JAPANESE,
    label: 'Japanese',
  },
  {
    name: Locale.KANNADA,
    label: 'Kannada',
  },
  {
    name: Locale.KOREAN,
    label: 'Korean',
  },
  {
    name: Locale.LATVIAN,
    label: 'Latvian',
  },
  {
    name: Locale.LITHUANIAN,
    label: 'Lithuanian',
  },
  {
    name: Locale.MALAY,
    label: 'Malay',
  },
  {
    name: Locale.MALAYALAM,
    label: 'Malayalam',
  },
  {
    name: Locale.MARATHI,
    label: 'Marathi',
  },
  {
    name: Locale.NORWEGIAN,
    label: 'Norwegian',
  },
  {
    name: Locale.PERSIAN,
    label: 'Persian',
  },
  {
    name: Locale.POLISH,
    label: 'Polish',
  },
  {
    name: Locale.PORTUGUESE,
    label: 'Portuguese',
  },
  {
    name: Locale.PUNJABI,
    label: 'Punjabi',
  },
  {
    name: Locale.ROMANIAN,
    label: 'Romanian',
  },
  {
    name: Locale.RUSSIAN,
    label: 'Russian',
  },
  {
    name: Locale.SERBIAN,
    label: 'Serbian',
  },
  {
    name: Locale.SLOVAK,
    label: 'Slovak',
  },
  {
    name: Locale.SLOVENIAN,
    label: 'Slovenian',
  },
  {
    name: Locale.SPANISH,
    label: 'Spanish',
  },
  {
    name: Locale.SWAHILI,
    label: 'Swahili',
  },
  {
    name: Locale.SWEDISH,
    label: 'Swedish',
  },
  {
    name: Locale.TAMIL,
    label: 'Tamil',
  },
  {
    name: Locale.TELUGU,
    label: 'Telugu',
  },
  {
    name: Locale.THAI,
    label: 'Thai',
  },
  {
    name: Locale.TURKISH,
    label: 'Turkish',
  },
  {
    name: Locale.UKRAINIAN,
    label: 'Ukrainian',
  },
  {
    name: Locale.URDU,
    label: 'Urdu',
  },
  {
    name: Locale.VIETNAMESE,
    label: 'Vietnamese',
  },
  {
    name: Locale.WELSH,
    label: 'Welsh',
  },
  {
    name: Locale.XHOSA,
    label: 'Xhosa',
  },
  {
    name: Locale.ZULU,
    label: 'Zulu',
  },
];

const INIT_LANG: Translation<SimpleDefinitions> = {
  name: LOCALES.find((l) => l.name === Locale.ENGLISH)?.label || 'English',
  locale: Locale.ENGLISH,
  description: 'English language pack',
  version: '1.0.0',
  definitions: {},
};

export class Translator<T extends Definitions> {
  private active: State<Translation<T>>;
  private translations: Map<Locale, State<Translation<T>>> = new Map();
  private listeners: Set<() => void> = new Set();
  private unsubscribe: Unsubscribe | undefined;

  public get locales(): Array<ItemTypeOf<Locales>> {
    return LOCALES.filter((l) => this.translations.has(l.name));
  }

  public constructor(
    public baseURL = '/i18n',
    translation: Translation<T> = INIT_LANG as never
  ) {
    this.register(translation);
    this.active = this.translations.get(translation.locale) as never;
    this.use(translation.locale);
  }

  public async load(locales: Locale | Locale[]): Promise<void> {
    if (Array.isArray(locales)) {
      await Promise.all(locales.map((locale) => this.load(locale)));
      return;
    }

    const url = `${this.baseURL}/${locales}.json`.replace(/\/$/, '').replace(/\/\//g, '/');
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const lang = await response.json();
    this.register(lang);

    if (!this.active) {
      this.use(lang.locale);
    }
  }

  public register(translations: Translation<T> | Translation<T>[]): void {
    if (Array.isArray(translations)) {
      for (const translation of translations) {
        this.register(translation);
      }
      return;
    }

    this.translations.set(translations.locale, anchor(translations));
  }

  public unregister(locales: Locale | Locale[]): void {
    if (Array.isArray(locales)) {
      for (const locale of locales) {
        this.unregister(locale);
      }
      return;
    }

    this.translations.delete(locales);
  }

  public use(locale: Locale): void {
    if (typeof this.unsubscribe === 'function') {
      this.unsubscribe();
    }

    const translation = this.translations.get(locale);

    if (!translation) throw new Error(`[anchor:i18n] Translation for locale "${locale}" not found!`);

    this.active = translation;
    const [setting] = cookie<{ locale: string }>({ path: '/' });
    setting.locale = locale;

    this.publish();
    this.unsubscribe = this.active.subscribe(() => this.publish());
  }

  public get<P extends NestedPath<T>>(key: P): NestedPathValue<T, P> {
    const value = read(this.active.definitions, key as never) as never;

    if (typeof value !== 'undefined') {
      return value as never;
    } else {
      this.set(key, key as never);
      return key as never;
    }
  }

  public set<P extends NestedPath<T>, V extends NestedPathValue<T, P>>(key: P, value: V): void {
    write(this.active.definitions, key as never, value as never);
  }

  public speak<P extends NestedPath<T>>(key: P, params?: SpeakParams): string {
    const value = this.get(key) || key;

    if (typeof value === 'string') {
      if (!params) return value;
      return applyParams(value, params);
    }

    return applyParams(typeof value === 'object' ? JSON.stringify(value) : String(value), params);
  }

  public whisper<P extends NestedPath<T>>(key: P, params?: SpeakParams): Readable<string> {
    return {
      subscribe: (run, emit = true) => {
        if (emit) {
          run(this.speak(key, params), { type: 'init' });
        }

        const speak = () => {
          run(this.speak(key, params), { type: 'update' });
        };

        this.listeners.add(speak);

        return () => {
          this.listeners.delete(speak);
        };
      },
    } as Readable<string>;
  }

  public assign(translations: Part<T>): void {
    for (const [key, value] of entries(translations)) {
      this.set(key as never, value as never);
    }
  }

  public rem<P extends NestedPath<T>>(key: P): void {
    const parts = (key as string).split('.') as string[];

    if (parts.length === 1) {
      delete this.active.definitions[key as never];
      return;
    }

    const last = parts.pop();
    const parent = read(this.active.definitions, parts.join('.') as never) as Rec;

    if (typeof parent === 'object' && last) {
      delete parent[last];
    }
  }

  public clear(): void {
    for (const key in this.active.definitions) {
      this.rem(key as never);
    }
  }

  private publish() {
    for (const whisper of this.listeners) {
      whisper();
    }
  }
}

export const translator = <T extends Definitions = SimpleDefinitions>(
  baseURL?: string,
  translation?: Translation<T>
): TranslatorFactory<T> => {
  const instance = new Translator<T>(baseURL, translation);

  const speaker = <P extends NestedPath<T>>(key: P, params: SpeakParams) => {
    return instance.speak(key, params);
  };

  return [speaker, instance] as never;
};

const GLOBAL_TRANSLATOR: Translator<SimpleDefinitions> = new Translator<SimpleDefinitions>();
translator.global = GLOBAL_TRANSLATOR as Translator<SimpleDefinitions>;

export function speak(key: string, params?: SpeakParams): string {
  return GLOBAL_TRANSLATOR?.speak(key, params) || key;
}

export function whisper(key: string, params?: SpeakParams): Readable<string> {
  return GLOBAL_TRANSLATOR?.whisper(key, params) || ({ subscribe: () => () => null } as never);
}

export function registerLocale(
  translations: Translation<SimpleDefinitions> | Translation<SimpleDefinitions>[],
  activate?: boolean
): void {
  GLOBAL_TRANSLATOR?.register(translations);

  if (!Array.isArray(translations) && activate) {
    GLOBAL_TRANSLATOR?.use(translations.locale);
  }
}

export function useLocale(locale: Locale): void {
  GLOBAL_TRANSLATOR?.use(locale);
}

export async function loadLocale(locale: Locale): Promise<void> {
  return GLOBAL_TRANSLATOR?.load(locale);
}

export type PreferredLanguage = {
  id: Locale;
  name: string;
};

export function getPreferredLang(headers: Headers): PreferredLanguage[] {
  const languages = (headers.get('accept-language') || '').split(';');
  return languages.map((item) => {
    const [name, id] = item.split(',');
    return { id, name } as never;
  });
}

function applyParams(value: string, params?: SpeakParams): string {
  if (!params) return value;

  return value.replace(/\{(\w+)\}/g, (_, key) => {
    if (!(key in params)) return _;

    const param = params[key];

    if (param instanceof Date) {
      return param.toISOString();
    } else {
      return String(param ?? _);
    }
  });
}
