import { db } from '../../../shared/infrastructure/db.js';

export class PasswordResetRepository {
  async createPasswordResetToken(input: {
    password_reset_token_id: string;
    user_id: string;
    token_hash: string;
    expires_at: Date;
    created_at: Date;
    updateby: string;
  }) {
    await db.insertInto('PASSWORD_RESET_TOKENS')
      .values({
        password_reset_token_id: input.password_reset_token_id,
        user_id: input.user_id,
        token_hash: input.token_hash,
        expires_at: input.expires_at,
        used_at: null,
        created_at: input.created_at,
        last_update: input.created_at,
        updateby: input.updateby,
      })
      .execute();
  }

  async invalidatePasswordResetTokensForUser(userId: string) {
    await db.updateTable('PASSWORD_RESET_TOKENS')
      .set({
        used_at: new Date(),
        last_update: new Date(),
        updateby: 'SYSTEM',
      })
      .where('user_id', '=', userId)
      .where('used_at', 'is', null)
      .execute();
  }

  async findPasswordResetTokenByHash(tokenHash: string) {
    return await db.selectFrom('PASSWORD_RESET_TOKENS as prt')
      .innerJoin('USERS as u', 'u.user_id', 'prt.user_id')
      .select([
        'prt.password_reset_token_id',
        'prt.user_id',
        'prt.token_hash',
        'prt.expires_at',
        'prt.used_at',
        'u.email',
        'u.full_name',
      ])
      .where('prt.token_hash', '=', tokenHash)
      .executeTakeFirst();
  }

  async markPasswordResetTokenUsed(passwordResetTokenId: string) {
    await db.updateTable('PASSWORD_RESET_TOKENS')
      .set({
        used_at: new Date(),
        last_update: new Date(),
        updateby: 'SYSTEM',
      })
      .where('password_reset_token_id', '=', passwordResetTokenId)
      .execute();
  }
}

export const passwordResetRepository = new PasswordResetRepository();
