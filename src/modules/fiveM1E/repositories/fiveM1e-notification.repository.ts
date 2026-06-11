import { db } from '../../../shared/infrastructure/db.js';

export class FiveM1eNotificationRepository {
  async findEmailElements(pic: string, action: string) {
    return await db
      .selectFrom('TBL_5M1E_EmailElements')
      .select([
        'ElementID as element_id',
        'ElementName as element_name',
        'ElementValue as element_value',
        'Attribute1 as attribute_1',
        'Attribute2 as attribute_2',
        'Attribute3 as attribute_3',
      ] as any)
      .where('Attribute1', '=', pic)
      .where('Attribute2', '=', action)
      .execute();
  }

  async findUserContactsByIds(userIds: string[]) {
    const normalized = Array.from(
      new Set(
        userIds
          .map((value) => String(value || '').trim())
          .filter(Boolean),
      ),
    );

    if (normalized.length === 0) {
      return [];
    }

    return await db
      .selectFrom('USERS')
      .select([
        'user_id as userId',
        'full_name as fullName',
        'email',
        'active_flag as activeFlag',
      ] as any)
      .where('user_id', 'in', normalized)
      .execute();
  }
}

export const fiveM1eNotificationRepository = new FiveM1eNotificationRepository();
