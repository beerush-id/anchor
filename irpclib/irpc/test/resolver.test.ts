import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ERROR_CODE } from '../src/error.js';
import type { IRPCHandler } from '../src/index.js';
import { createPackage } from '../src/module.js';
import { IRPCResolver } from '../src/resolver.js';

describe('IRPC Resolver', () => {
  describe('Resolve Request', () => {
    it('should resolve valid request', async () => {
      const rpc = createPackage();
      type TestFunc = (input: { name: string }) => Promise<string>;
      const testFunc = rpc.declare<TestFunc>({ name: 'testFunc' });

      const handler: TestFunc = async (input) => `Hello ${input.name}`;
      rpc.construct(testFunc, handler);

      const resolver = new IRPCResolver(
        {
          id: '1',
          name: 'testFunc',
          args: [{ name: 'World' }],
        },
        rpc
      );

      const result = await resolver.resolve();
      expect(result).toEqual({
        id: '1',
        name: 'testFunc',
        result: 'Hello World',
      });
    });

    it('should return error for non-existent function', async () => {
      const rpc = createPackage();
      const resolver = new IRPCResolver(
        {
          id: '1',
          name: 'nonExistent',
          args: [],
        },
        rpc
      );

      const result = await resolver.resolve();
      expect(result).toEqual({
        id: '1',
        name: 'nonExistent',
        error: {
          code: ERROR_CODE.NOT_FOUND,
          message: 'IRPC "nonExistent" does not exist.',
        },
      });
    });

    it('should validate input against schema', async () => {
      const rpc = createPackage();
      type TestFunc = (name: string) => Promise<string>;
      const testFunc = rpc.declare<TestFunc>({
        name: 'testFunc',
        schema: {
          input: [z.string()],
        },
      });

      const handler: TestFunc = async (name) => `Hello ${name}`;
      rpc.construct(testFunc, handler);

      // Valid input
      const resolver1 = new IRPCResolver(
        {
          id: '1',
          name: 'testFunc',
          args: ['World'],
        },
        rpc
      );

      const result1 = await resolver1.resolve();
      expect(result1).toEqual({
        id: '1',
        name: 'testFunc',
        result: 'Hello World',
      });

      // Invalid input
      const resolver2 = new IRPCResolver(
        {
          id: '2',
          name: 'testFunc',
          args: [123], // Number instead of string
        },
        rpc
      );

      const result2 = await resolver2.resolve();
      expect(result2).toEqual({
        id: '2',
        name: 'testFunc',
        error: {
          code: ERROR_CODE.INVALID_INPUT,
          message: expect.any(String),
        },
      });

      // Invalid argument size
      const resolver3 = new IRPCResolver(
        {
          id: '3',
          name: 'testFunc',
          args: [],
        },
        rpc
      );

      const result3 = await resolver3.resolve();
      expect(result3).toEqual({
        id: '3',
        name: 'testFunc',
        error: {
          code: ERROR_CODE.INVALID_INPUT,
          message: expect.any(String),
        },
      });
    });

    it('should validate output against schema', async () => {
      const rpc = createPackage();
      type TestFunc = () => Promise<string>;
      const testFunc = rpc.declare<TestFunc>({
        name: 'testFunc',
        schema: {
          output: z.string(),
        },
      });

      // Valid output
      const handler1: TestFunc = async () => 'Valid String';
      rpc.construct(testFunc, handler1);

      const resolver1 = new IRPCResolver(
        {
          id: '1',
          name: 'testFunc',
          args: [],
        },
        rpc
      );

      const result1 = await resolver1.resolve();
      expect(result1).toEqual({
        id: '1',
        name: 'testFunc',
        result: 'Valid String',
      });

      // Invalid output
      type BadTestFunc = () => Promise<number>;
      const badHandler: BadTestFunc = async () => 123;
      rpc.construct(testFunc, badHandler as never); // Number instead of string

      const resolver2 = new IRPCResolver(
        {
          id: '2',
          name: 'testFunc',
          args: [],
        },
        rpc
      );

      const result2 = await resolver2.resolve();
      expect(result2).toEqual({
        id: '2',
        name: 'testFunc',
        error: {
          code: ERROR_CODE.INVALID_OUTPUT,
          message: expect.any(String),
        },
      });
    });

    it('should handle function exceptions', async () => {
      const rpc = createPackage();
      const testFunc = rpc.declare<IRPCHandler>({
        name: 'testFunc',
      });

      rpc.construct(testFunc, async () => {
        throw new Error('Function error');
      });

      const resolver = new IRPCResolver(
        {
          id: '1',
          name: 'testFunc',
          args: [],
        },
        rpc
      );

      const result = await resolver.resolve();
      expect(result).toEqual({
        id: '1',
        name: 'testFunc',
        error: {
          code: ERROR_CODE.UNKNOWN,
          message: 'Function error',
        },
      });
    });
  });

  describe('Resolve Spec', () => {
    it('should get spec from module', () => {
      const rpc = createPackage();
      const testFunc = rpc.declare({
        name: 'testFunc',
        description: 'Test function',
      });

      const resolver = new IRPCResolver(
        {
          id: '1',
          name: 'testFunc',
          args: [],
        },
        rpc
      );

      expect(typeof testFunc).toBe('function');
      expect(resolver.spec).toBeDefined();
      expect(resolver.spec?.name).toBe('testFunc');
      expect(resolver.spec?.description).toBe('Test function');
    });

    it('should return undefined for non-existent spec', () => {
      const rpc = createPackage();
      const resolver = new IRPCResolver(
        {
          id: '1',
          name: 'nonExistent',
          args: [],
        },
        rpc
      );

      expect(resolver.spec).toBeUndefined();
    });
  });
});
