export const S_MAP_TYPE = 'anchor-serializable-map';

export type SMapSnapshot<K, V> = {
  /** The type identifier for the map */
  entity: typeof S_MAP_TYPE;
  /** The entries of the map as an array of key-value pairs */
  entries: [K, V][];
};

/**
 * A Map implementation that can be serialized to and from JSON snapshots.
 * Extends the native Map class with additional serialization capabilities.
 * @template K - The key type of the map
 * @template V - The value type of the map
 */
export class SerializableMap<K, V> extends Map<K, V> {
  /**
   * Creates a new SerializableMap instance.
   * @param init - Optional initial data for the map, either as an iterable of entries or a snapshot
   */
  constructor(init?: Iterable<[K, V]>);

  /**
   * Creates a new SerializableMap instance from a snapshot.
   * @param init - A snapshot to restore the map from
   */
  constructor(init?: SMapSnapshot<K, V>);

  /**
   * Creates a new SerializableMap instance from either initial data or a snapshot.
   * @param init - Optional initial data for the map, either as an iterable of entries or a snapshot
   */
  constructor(init?: Iterable<[K, V]> | SMapSnapshot<K, V>) {
    if (!init || typeof init !== 'object') {
      super();
      return;
    }

    super(
      (init as SMapSnapshot<K, V>)?.entity === S_MAP_TYPE
        ? (init as SMapSnapshot<K, V>).entries
        : (init as Iterable<[K, V]>)
    );
  }

  /**
   * Creates a snapshot of the current map state that can be serialized to JSON.
   * @returns A snapshot containing the map's type identifier and all entries
   */
  public snapshot(): SMapSnapshot<K, V> {
    return {
      entity: S_MAP_TYPE,
      entries: [...this.entries()],
    };
  }

  /**
   * Serializes the map to a JSON string representation.
   * @returns A JSON string of the map's snapshot
   */
  public stringify() {
    return JSON.stringify(this.snapshot());
  }
}

/**
 * Creates a new SerializableMap instance.
 * @template K - The key type of the map
 * @template V - The value type of the map
 * @param init - Optional initial data for the map, either as an iterable of entries
 * @returns A new SerializableMap instance
 */
export function xMap<K, V>(init?: Iterable<[K, V]>): SerializableMap<K, V>;

/**
 * Creates a new SerializableMap instance from a snapshot.
 * @template K - The key type of the map
 * @template V - The value type of the map
 * @param init - A snapshot to restore the map from
 * @returns A new SerializableMap instance
 */
export function xMap<K, V>(init?: SMapSnapshot<K, V>): SerializableMap<K, V>;

/**
 * Creates a new SerializableMap instance from either initial data or a snapshot.
 * @template K - The key type of the map
 * @template V - The value type of the map
 * @param init - Optional initial data for the map, either as an iterable of entries or a snapshot
 * @returns A new SerializableMap instance
 */
export function xMap<K, V>(init?: Iterable<[K, V]> | SMapSnapshot<K, V>) {
  return new SerializableMap<K, V>(init as Iterable<[K, V]>);
}
