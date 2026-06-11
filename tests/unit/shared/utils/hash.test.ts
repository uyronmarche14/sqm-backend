import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../../../src/shared/utils/hash.js';

describe('Hash Utility', () => {
  it('should hash a password into a different string', async () => {
    const password = 'mySecretPassword123!';
    const hash = await hashPassword(password);
    
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should verify a correct password against its hash', async () => {
    const password = 'mySecretPassword123!';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const password = 'mySecretPassword123!';
    const wrongPassword = 'wrongPassword123!';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(wrongPassword, hash);
    expect(isValid).toBe(false);
  });
});
