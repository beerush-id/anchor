import type {
  ZodArray,
  ZodBoolean,
  ZodNull,
  ZodNumber,
  ZodObject,
  ZodSafeParseResult,
  ZodString,
  ZodUndefined,
} from 'zod/v4';
import type { ErrorCode } from './error.js';
import type { IRPCTransport } from './transport.js';

/**
 * A registry that maps IRPCHandlers to their corresponding IRPCHosts.
 * Uses WeakMap to avoid memory leaks by not preventing garbage collection of handlers.
 */
export type IRPCStubStore = WeakMap<IRPCHandler, IRPCSpec<IRPCInputs, IRPCOutput>>;

/**
 * A store that maps string identifiers to IRPCHosts.
 * Used to keep track of available RPC hosts by their names.
 */
export type IRPCSpecStore = Map<string, IRPCSpec<IRPCInputs, IRPCOutput>>;

/**
 * Represents primitive data types that can be used in IRPC communications.
 * Includes string, number, boolean, null, and undefined.
 */
export type IRPCPrimitive = string | number | boolean | null | undefined;

/**
 * Represents an object structure where keys are strings and values are IRPCData.
 * Used for structured data in RPC communications.
 */
export type IRPCObject = { [key: string]: IRPCData };

/**
 * Represents all possible data types in IRPC, including primitives, objects, and arrays.
 * This is a recursive type that allows nested structures.
 */
export type IRPCData = IRPCPrimitive | IRPCObject | IRPCData[];

/**
 * Union type of all primitive Zod schema types used for validation.
 */
export type IRPCPrimitiveSchema = ZodString | ZodNumber | ZodBoolean | ZodNull | ZodUndefined;

/**
 * Zod object schema type used for validating structured data.
 */
export type IRPCObjectSchema = ZodObject;

/**
 * Zod array schema that can contain primitive schemas or object schemas.
 */
export type IRPCArraySchema = ZodArray<IRPCPrimitiveSchema | IRPCObjectSchema>;

/**
 * Union type of all possible Zod schema types used in IRPC for input/output validation.
 */
export type IRPCDataSchema = IRPCPrimitiveSchema | IRPCObjectSchema | IRPCArraySchema;

/**
 * Type representing the result of a Zod schema validation operation.
 */
export type IRPCParseResult = ZodSafeParseResult<IRPCDataSchema>;

/**
 * Represents an array of input schemas for an RPC function.
 */
export type IRPCInputs = IRPCDataSchema[];

/**
 * Represents the output schema for an RPC function.
 */
export type IRPCOutput = IRPCDataSchema;

/**
 * Defines the basic information about an RPC namespace.
 */
export type IRPCPackageInfo = {
  /** The name of the namespace */
  name: string;
  /** The version of the namespace */
  version: string;
  /** Optional description of the namespace */
  description?: string;
};

export type IRPCPackageConfig = IRPCPackageInfo & {
  timeout?: number;
  transport?: IRPCTransport;
};

/**
 * Defines an RPC module which extends a namespace with execution capabilities.
 */
export type IRPCModule = IRPCPackageInfo & {
  /** Optional timeout for RPC calls */
  timeout?: number;
  /** Optional transport mechanism for RPC communications */
  transport?: IRPCTransport;
};

/**
 * Represents the payload of an RPC call with its name and arguments.
 */
export type IRPCPayload = {
  /** The name of the RPC function to call */
  name: string;
  /** The arguments to pass to the RPC function */
  args: IRPCData[];
};

/**
 * Defines the schema for input and output validation of an RPC function.
 */
export type IRPCSchema<I extends IRPCInputs, O extends IRPCOutput> = {
  /** Optional input validation schemas */
  input?: I;
  /** Optional output validation schema */
  output?: O;
};

/**
 * Type definition for an RPC handler function.
 * Takes IRPCData arguments and returns a Promise resolving to IRPCData.
 */

// biome-ignore lint/complexity/noBannedTypes: <Generic alias>
export type IRPCHandler = Function;

/**
 * Configuration options for initializing an RPC function.
 * Contains metadata and constraints for the RPC function.
 *
 * @template I - Tuple of input validation schemas
 * @template O - Output validation schema
 */
export type IRPCInit<I extends IRPCInputs, O extends IRPCOutput> = {
  /** The name of the RPC function */
  name: string;
  /** Optional schema for input/output validation */
  schema?: IRPCSchema<I, O>;
  /** Optional description of the RPC function */
  description?: string;
  /** Optional maximum age of a call in milliseconds */
  maxAge?: number;
  /** Optional timeout for RPC calls */
  timeout?: number;
};

/**
 * Complete specification for an RPC function including its implementation.
 * Extends IRPCInit with the actual handler function.
 *
 * @template I - Tuple of input validation schemas
 * @template O - Output validation schema
 */
export type IRPCSpec<I extends IRPCInputs, O extends IRPCOutput> = IRPCInit<I, O> & {
  /** The actual handler function that implements the RPC */
  handler: IRPCHandler;
};

/**
 * Represents an incoming RPC request.
 */
export type IRPCRequest = {
  /** Unique identifier for the request */
  id: string;
  /** Name of the RPC function being called */
  name: string;
  /** Arguments for the RPC function */
  args: unknown[];
};

export type IRPCError = {
  code: ErrorCode;
  message: string;
};

/**
 * Represents an RPC response.
 */
export type IRPCResponse = {
  /** Unique identifier matching the request */
  id: string;
  /** Name of the RPC function that was called */
  name: string;
  /** Error message if the call failed */
  error?: IRPCError;
  /** Result of the RPC call if successful */
  result?: unknown;
};

export type IRPCCache = {
  data: IRPCData;
  expiresAt: number;
  timestamp: number;
};

/**
 * Represents a cache for RPC responses.
 */
export type IRPCCaches = Map<string, IRPCCache>;

/**
 * Context storage mechanism for RPC operations.
 */
export type IRPCContext<K, V> = Map<K, V>;

/**
 * Interface for managing RPC context stores.
 */
export type IRPCContextProvider = {
  /**
   * Runs a function within a specific context.
   * @param ctx The context to run within
   * @param fn The function to execute
   */
  run<R, K, V>(ctx: IRPCContext<K, V>, fn: () => R): R;

  /** Gets the current context store */
  getStore<K, V>(): IRPCContext<K, V>;
};

export type TransportConfig = {
  timeout?: number;
  debounce?: number;
};
