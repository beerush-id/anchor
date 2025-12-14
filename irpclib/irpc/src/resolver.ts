import { ERROR_CODE } from './error.js';
import type { IRPCPackage } from './module.js';
import type {
  IRPCData,
  IRPCError,
  IRPCInputs,
  IRPCOutput,
  IRPCParseResult,
  IRPCRequest,
  IRPCResponse,
} from './types.js';

/**
 * Resolver class for handling IRPC requests
 *
 * This class is responsible for resolving IRPC requests by validating inputs,
 * executing the requested method, and formatting the response.
 */
export class IRPCResolver {
  /**
   * Getter for the specification of the RPC method
   *
   * Retrieves the specification of the RPC method from the module based on the request
   */
  public get spec() {
    return this.module.get(this.req);
  }

  /**
   * Creates a new IRPCResolver instance
   *
   * @param req - The IRPC request object containing id, name and arguments
   * @param module - The IRPC package module that contains the method to be executed
   */
  constructor(
    public req: IRPCRequest,
    public module: IRPCPackage
  ) {}

  /**
   * Resolves an IRPC request
   *
   * This method validates the request, parses inputs according to the schema,
   * and forwards the request to the appropriate handler.
   *
   * @returns A promise that resolves to an IRPC response with either the result or an error
   */
  public async resolve(): Promise<IRPCResponse> {
    const { id, name, args } = this.req;

    // Check if the requested method exists in the module
    if (!this.spec) {
      const error: IRPCError = {
        code: ERROR_CODE.NOT_FOUND,
        message: `IRPC "${name}" does not exist.`,
      };

      return { id, name, error };
    }

    const { schema } = this.spec;
    const inputs = parseInput(args, schema?.input);

    // Validate inputs against the schema
    if (!inputs.success) {
      const error: IRPCError = {
        code: ERROR_CODE.INVALID_INPUT,
        message: inputs.error,
      };

      return { id, name, error };
    }

    // Forward the validated request
    return this.forward({ id, name, args: inputs.data }, schema?.output);
  }

  /**
   * Forwards a validated request to the module's resolver
   *
   * @param req - The validated IRPC request object
   * @param schema - Optional output schema for result validation
   * @returns A promise that resolves to an IRPC response with the result or an error
   */
  public async forward({ id, name, args }: IRPCRequest, schema?: IRPCOutput) {
    try {
      const result = await this.module.resolve({ id, name, args });
      const output = parseOutput(result, schema);

      // Validate output against schema if provided
      if (output.success) {
        return { id, name, result: output.data };
      } else {
        const error: IRPCError = {
          code: ERROR_CODE.INVALID_OUTPUT,
          message: output.error?.message,
        };

        return { id, name, error };
      }
    } catch (error) {
      // Handle any unexpected errors during execution
      return { id, name, error: { code: ERROR_CODE.UNKNOWN, message: (error as Error).message } };
    }
  }
}

/**
 * Parses and validates input arguments against their schemas
 *
 * @param args - Array of input arguments
 * @param schema - Optional schema for validating the arguments
 * @returns Parsed result with success status and any error messages
 */
function parseInput(args: unknown[], schema?: IRPCInputs) {
  // Check if argument count matches schema length
  if (schema && args.length !== schema.length) {
    return {
      data: args,
      success: false,
      error: 'Invalid arguments',
    };
  }

  // Parse each argument according to its schema
  const parsed = args.map((arg, i) => {
    const input = schema?.[i];
    return input ? input.safeParse(arg) : { success: true, data: arg };
  }) as IRPCParseResult[];

  return {
    data: parsed.map((arg) => arg.data) as IRPCData[],
    error: parsed
      .filter((arg) => !arg.success)
      .map((arg) => arg.error?.message)
      .join('\n'),
    success: parsed.every((arg) => arg.success),
  };
}

/**
 * Parses and validates output result against its schema
 *
 * @param result - The result to validate
 * @param schema - Optional schema for validating the result
 * @returns Parsed result with success status and any error messages
 */
function parseOutput(result: unknown, schema?: IRPCOutput) {
  return schema
    ? schema.safeParse(result)
    : ({
        success: true,
        data: result,
      } as IRPCParseResult);
}
