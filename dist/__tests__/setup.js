/**
 * Jest Test Setup
 *
 * This file runs before all tests to configure the test environment.
 */
// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
// Clean up after all tests
afterAll(async () => {
    // Add any global cleanup here (e.g., close database connections)
});
export {};
