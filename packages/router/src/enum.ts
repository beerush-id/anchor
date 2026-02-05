export const ROUTE_TYPE = {
  INDEX: 'index',
  STATIC: 'static',
  DYNAMIC: 'dynamic',
  WILDCARD: 'wildcard',
  FALLBACK: 'fallback',
} as const;

export const MATCH_MODE = {
  FOLLOW: 'follow',
};

export const PRELOAD_MODE = {
  NONE: 'none',
  EAGER: 'eager',
  HOVER: 'hover',
  FOLLOW: 'follow',
} as const;

export const TRAILING_SLASH_MODE = {
  STRIP: 'strip',
  FORCE: 'force',
  IGNORE: 'ignore',
} as const;
