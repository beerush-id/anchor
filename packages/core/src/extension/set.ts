/**
 * Serializable Set Type Identifier
 * A constant string that identifies the type of serializable set snapshot.
 */
export const S_SET_TYPE = 'anchor-serializable-set';

/**
 * Serializable Set Snapshot Interface
 * Represents the serialized state of a SerializableSet containing values of type V.
 *
 * @template V - The type of elements in the set
 */
export type SSetSnapshot<V> = {
  /** The type identifier for the serializable set */
  entity: string;
  /** The array of values contained in the set */
  values: V[];
};

/**
 * SerializableSet Class
 * Extends the native JavaScript Set to provide serialization capabilities.
 * Can be initialized with either an iterable of values or a snapshot object.
 *
 * @template V - The type of elements in the set
 */
export class SerializableSet<V> extends Set<V> {
  /**
   * Creates a new SerializableSet instance.
   *
   * @param init - Optional initialization parameter. Can be an iterable of values or a snapshot object.
   */
  constructor(init?: Iterable<V>);
  /**
   * Creates a new SerializableSet instance from a snapshot.
   *
   * @param init - A snapshot object representing the state of a SerializableSet.
   */
  constructor(init?: SSetSnapshot<V>);
  /**
   * Creates a new SerializableSet instance from either an iterable or a snapshot.
   *
   * @param init - Optional initialization parameter. Can be an iterable of values or a snapshot object.
   */
  constructor(init?: Iterable<V> | SSetSnapshot<V>) {
    if (!init || typeof init !== 'object') {
      super();
      return;
    }
    super((init as SSetSnapshot<V>).entity === S_SET_TYPE ? (init as SSetSnapshot<V>).values : (init as Iterable<V>));
  }

  /**
   * Creates a snapshot of the current set state.
   *
   * @returns A snapshot object representing the current state of the set.
   */
  public snapshot(): SSetSnapshot<V> {
    return {
      entity: S_SET_TYPE,
      values: [...this],
    };
  }

  /**
   * Converts the set to a JSON string representation.
   *
   * @returns A JSON string representation of the set's snapshot.
   */
  public stringify(): string {
    return JSON.stringify(this.snapshot());
  }
}

/**
 * Creates a new SerializableSet instance.
 *
 * @template V - The type of elements in the set
 * @param init - Optional initialization parameter. Can be an iterable of values.
 * @returns A new SerializableSet instance.
 */
export function xSet<V>(init?: Iterable<V>): SerializableSet<V>;
/**
 * Creates a new SerializableSet instance from a snapshot.
 *
 * @template V - The type of elements in the set
 * @param init - A snapshot object representing the state of a SerializableSet.
 * @returns A new SerializableSet instance.
 */
export function xSet<V>(init?: SSetSnapshot<V>): SerializableSet<V>;
/**
 * Creates a new SerializableSet instance from either an iterable or a snapshot.
 *
 * @template V - The type of elements in the set
 * @param init - Optional initialization parameter. Can be an iterable of values or a snapshot object.
 * @returns A new SerializableSet instance.
 */
export function xSet<V>(init?: Iterable<V> | SSetSnapshot<V>) {
  return new SerializableSet(init as Iterable<V>);
}
