import { BaseRepository } from '../../shared/infrastructure/BaseRepository.js';

export class AuthRepository extends BaseRepository<'USERS'> {
  constructor() {
    super('USERS');
  }

  /**
   * Retrieves a User by their exact email, joining their role name.
   */
  async findByEmail(email: string) {
    return await this.getQuery()
      .leftJoin('ROLES', 'ROLES.role_id', 'USERS.role_id')
      .selectAll('USERS')
      .select('ROLES.role_name')
      .where('email', '=', email)
      .executeTakeFirst();
  }

  // NOTE: If your users are authenticated against AD (Active Directory), 
  // you might just insert them or fetch them, rather than storing their password_hash.
  // For the sake of the blueprint, we assume standard JWT + local storage.
  
  /**
   * Updates the User's last login date or refresh token (if stored in DB)
   */
  async updateUserToken(_userId: number, _refreshToken: string | null) {
    // Implement token saving logic if storing in DB for revoking later.
    // Example: await db.updateTable('USERS').set({ refresh_token: refreshToken }).where('user_id', '=', userId).execute();
  }
}

export const authRepository = new AuthRepository();
