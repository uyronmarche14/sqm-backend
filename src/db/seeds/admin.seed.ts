import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';

import { db } from '../../shared/infrastructure/db.js';
import { logDb } from '../lib/db-safety.js';
import { ensureTables, isYes, SYSTEM_UPDATE_BY, upsertByMatch } from './helpers.js';
import { SUPER_ADMIN_ROLE, SYSTEM_SITE } from './seed-constants.js';

function requiredAdminEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set when DB_ADMIN_SEED=YES.`);
  }
  return value;
}

function optionalAdminEnv(name: string, fallback: string) {
  return process.env[name] || fallback;
}

function resolveAdminEmail() {
  if (process.env.ADMIN_EMAIL) {
    return process.env.ADMIN_EMAIL;
  }

  if (process.env.SEED_ADMIN_EMAIL) {
    logDb('SEED_ADMIN_EMAIL is deprecated. Use ADMIN_EMAIL instead.');
    return process.env.SEED_ADMIN_EMAIL;
  }

  return requiredAdminEnv('ADMIN_EMAIL');
}

function resolveAdminPassword() {
  if (process.env.ADMIN_PASSWORD) {
    return process.env.ADMIN_PASSWORD;
  }

  if (process.env.SEED_ADMIN_PASSWORD) {
    logDb('SEED_ADMIN_PASSWORD is deprecated. Use ADMIN_PASSWORD instead.');
    return process.env.SEED_ADMIN_PASSWORD;
  }

  return requiredAdminEnv('ADMIN_PASSWORD');
}

export async function runAdminSeed(invocation = 'db:seed:admin') {
  if (!isYes(process.env.DB_ADMIN_SEED)) {
    logDb(`${invocation}: skipped because DB_ADMIN_SEED is not YES.`);
    return;
  }

  await ensureTables(['MFG_SITES', 'ROLES', 'USERS', 'FORMS', 'ROLE_ACCESS']);

  const adminEmail = resolveAdminEmail();
  const adminPassword = resolveAdminPassword();
  const adminFullName = optionalAdminEnv('ADMIN_FULL_NAME', 'System Admin');
  const adminSiteName = optionalAdminEnv('ADMIN_SITE_NAME', SYSTEM_SITE.name);
  const adminSiteCode = optionalAdminEnv('ADMIN_SITE_CODE', SYSTEM_SITE.code);
  const now = new Date();

  const site = await upsertByMatch({
    table: 'MFG_SITES',
    matchOn: ['site_code'],
    preserveOnUpdate: ['site_id'],
    row: {
      site_id: SYSTEM_SITE.id,
      site_name: adminSiteName,
      site_code: adminSiteCode,
      site_desc: 'Site assigned to seeded administrator',
      active_flag: 1,
      last_update: now,
      updateby: SYSTEM_UPDATE_BY,
    },
  });

  const role = await upsertByMatch({
    table: 'ROLES',
    matchOn: ['role_name'],
    preserveOnUpdate: ['role_id'],
    row: {
      role_id: SUPER_ADMIN_ROLE.id,
      role_name: SUPER_ADMIN_ROLE.name,
      role_desc: SUPER_ADMIN_ROLE.description,
      active_flag: 1,
      last_update: now,
      updateby: SYSTEM_UPDATE_BY,
    },
  });

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await upsertByMatch({
    table: 'USERS',
    matchOn: ['user_id'],
    preserveOnUpdate: ['creation_date'],
    row: {
      user_id: 'USER-SYSTEM-ADMIN',
      full_name: adminFullName,
      email: adminEmail,
      password: passwordHash,
      role_id: role.role_id,
      site_id: site.site_id,
      creation_date: now,
      active_flag: 1,
      last_pasword_change: now,
      local_user: 1,
      login_flag: 1,
      last_update: now,
      updateby: SYSTEM_UPDATE_BY,
      new_flag: 0,
      change_pw: 0,
    },
  });

  logDb(`${invocation}: admin bootstrap complete for ${adminEmail}.`);
}

const isDirectInvocation = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectInvocation) {
  runAdminSeed()
    .then(async () => {
      await db.destroy();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('[db] Admin seed failed:', error);
      await db.destroy();
      process.exit(1);
    });
}
