export let DEV_MODE = true;
export let STRICT_MODE = true;

export function setDevMode(enabled: boolean, strict?: boolean) {
  DEV_MODE = enabled;
  STRICT_MODE = strict ?? STRICT_MODE;
}
