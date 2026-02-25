import { BaseRepository } from '../../shared/infrastructure/BaseRepository.js';
export class AuthRepository extends BaseRepository {
    constructor() {
        super('USERS');
    }
    /**
     * Retrieves a User by their exact username.
     * Fully Type-Safe query on the USERS table.
     */
    async findByUsername(username) {
        return await this.getQuery()
            .selectAll()
            .where('username', '=', username)
            .executeTakeFirst();
    }
    // NOTE: If your users are authenticated against AD (Active Directory), 
    // you might just insert them or fetch them, rather than storing their password_hash.
    // For the sake of the blueprint, we assume standard JWT + local storage.
    /**
     * Updates the User's last login date or refresh token (if stored in DB)
     */
    async updateUserToken(userId, refreshToken) {
        // Implement token saving logic if storing in DB for revoking later.
        // Example: await db.updateTable('USERS').set({ refresh_token: refreshToken }).where('user_id', '=', userId).execute();
    }
}
export const authRepository = new AuthRepository();
