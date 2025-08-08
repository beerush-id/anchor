let currentReader: Set<string> | undefined = undefined;

export function useReaderContext<T extends Set<string>>(value: T) {
  const prevValue = currentReader;
  currentReader = value;

  return () => {
    currentReader = prevValue;
  };
}

export function getReaderContext() {
  return currentReader;
}
