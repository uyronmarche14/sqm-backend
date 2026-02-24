/**
 * Example Test File
 * 
 * This file demonstrates the testing setup and can be used as a template
 * for writing new tests.
 */

describe('Example Test Suite', () => {
  describe('Basic Jest Functionality', () => {
    it('should pass a simple assertion', () => {
      expect(1 + 1).toBe(2);
    });

    it('should handle async operations', async () => {
      const result = await Promise.resolve('success');
      expect(result).toBe('success');
    });
  });

  describe('Test Hooks Example', () => {
    let value: string;

    beforeEach(() => {
      value = 'initialized';
    });

    it('should support beforeEach hook', () => {
      expect(value).toBe('initialized');
    });
  });

  describe('TypeScript Support', () => {
    interface TestData {
      id: string;
      name: string;
    }

    it('should work with TypeScript types', () => {
      const data: TestData = {
        id: '123',
        name: 'Test',
      };

      expect(data.id).toBe('123');
      expect(data.name).toBe('Test');
    });
  });
});
