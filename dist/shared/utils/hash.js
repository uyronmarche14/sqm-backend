import bcrypt from 'bcryptjs';
const SALT_ROUNDS = 10;
/**
 * Hashes a plaintext password
 */
export const hashPassword = async (password) => {
    return await bcrypt.hash(password, SALT_ROUNDS);
};
/**
 * Verifies a plaintext password against a hash
 */
export const verifyPassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};
