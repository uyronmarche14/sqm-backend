import { Selectable, Insertable, Updateable } from 'kysely';

// ============================================================================
// Users & Roles - Database Table Types
// ============================================================================

export interface UsersTable {
  user_id: string;
  full_name: string;
  email: string | null;
  password: string | null; 
  role_id: string | null;
  site_id: string | null;
  creation_date: Date | string | null;
  active_flag: boolean | number | null;
  last_pasword_change: Date | string | null;
  local_user: boolean | number | null;
  login_flag: boolean | number | null;
  last_update: Date | string | null;
  updateby: string | null;
  new_flag: boolean | number | null;
  change_pw: boolean | number | null;
}

export interface RolesTable {
  role_id: string;
  role_name: string;
}

// Helper types
export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type UserUpdate = Updateable<UsersTable>;
export type Role = Selectable<RolesTable>;
