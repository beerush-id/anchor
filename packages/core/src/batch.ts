const BATCHES = new Set<() => void>();

export function microbatch(fn: () => void, delay = 10) {
  if (BATCHES.has(fn)) return;

  if (!BATCHES.size) {
    setTimeout(() => {
      for (const handler of BATCHES) {
        handler();
      }

      BATCHES.clear();
    }, delay);
  }

  BATCHES.add(fn);
}
