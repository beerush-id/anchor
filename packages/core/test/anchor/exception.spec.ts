import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { captureStack } from '../../src/index.js';

describe('Anchor Core - Exception Handling', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('Capture Stack Functions', () => {
    describe('Warning', () => {
      it('should capture external warning', () => {
        captureStack.warning.external('Test Title', 'Test Body', 'Test Trace');
        expect(consoleWarnSpy).toHaveBeenCalled();
      });

      it('should capture external warning with non string trace', () => {
        captureStack.warning.external('Test Title', 'Test Body', () => {});
        expect(consoleWarnSpy).toHaveBeenCalled();
      });
    });

    describe('Error', () => {
      it('should capture internal error', () => {
        const error = new Error('Internal Error');
        captureStack.error.internal('Internal error occurred', error);
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it('should capture external error', () => {
        const error = new Error('External Error');
        captureStack.error.external('External error occurred', error);
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it('should capture external error with multi lines', () => {
        const error = new Error('External Error');
        captureStack.error.external('External error occurred\nNew line in the error message', error);
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it('should capture argument error', () => {
        const error = new Error('Argument Error');
        captureStack.error.argument('Argument error occurred', error);
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it('should capture validation error', () => {
        const error = new Error('Validation Error');
        captureStack.error.validation('Validation context', error);
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it('should capture external error with multi lines', () => {
        const error = new Error('Argument Error');
        captureStack.error.argument('Argument error occurred\nNew line in the error message', error);
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it('should throw validation error in strict mode', () => {
        const error = new Error('Validation Error');
        expect(() => {
          captureStack.error.validation('Validation context', error, true);
        }).toThrow();
      });
    });

    describe('Violation', () => {
      it('should capture init violation', () => {
        captureStack.violation.init('test value');
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it('should capture circular violation', () => {
        captureStack.violation.circular('testProp');
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it('should capture schema violation', () => {
        captureStack.violation.schema('expected', 'actual', false);
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it('should throw schema violation in strict mode', () => {
        expect(() => {
          captureStack.violation.schema('expected', 'actual', true);
        }).toThrow();
      });

      it('should capture setter violation', () => {
        captureStack.violation.setter('testProp');
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it('should capture remover violation', () => {
        captureStack.violation.remover('testProp');
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it('should capture method call violation', () => {
        captureStack.violation.methodCall('push' as never);
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it('should capture derivation violation', () => {
        captureStack.violation.derivation('push', new Error('Error'));
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it('should capture general violation', () => {
        captureStack.violation.general('Violation', 'push', new Error('Error'));
        vi.runAllTimers();
        expect(consoleErrorSpy).toHaveBeenCalled();
      });
    });

    describe('Contract Violation', () => {
      it('should capture contract init violation', () => {
        captureStack.contractViolation.init();
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it('should capture contract setter violation', () => {
        captureStack.contractViolation.setter('testProp');
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it('should capture contract remover violation', () => {
        captureStack.contractViolation.remover('testProp');
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it('should capture contract method read violation', () => {
        captureStack.contractViolation.methodRead('push');
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it('should capture contract method call violation', () => {
        captureStack.contractViolation.methodCall('push' as never);
        expect(consoleErrorSpy).toHaveBeenCalled();
      });
    });
  });
});
