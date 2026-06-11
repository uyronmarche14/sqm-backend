import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'node:url';

import { db } from '../../shared/infrastructure/db.js';
import { logDb } from '../lib/db-safety.js';
import { ensureTables, isYes, SYSTEM_UPDATE_BY, upsertByMatch } from './helpers.js';
import { SUPER_ADMIN_ROLE } from './seed-constants.js';

const ADMIN_ROLE_ID = SUPER_ADMIN_ROLE.id;

const ALL_PERMISSIONS_TRUE = {
  can_view: 1,
  can_viewlist: 1,
  can_add: 1,
  can_edit: 1,
  can_delete: 1,
  can_approve: 1,
  can_check: 1,
  can_print: 1,
  can_export: 1,
  can_attach: 1,
  can_response: 1,
  multiple_approval: 1,
  per_site: 1,
  per_supplier: 1,
  registration_notify: 1,
  maintenance_notify: 1,
  transaction_notify: 1,
  pic: 1,
};

export async function runRoleAccessSeed(invocation = 'db:seed:role-access') {
  if (!isYes(process.env.DB_ROLE_ACCESS_SEED)) {
    logDb(`${invocation}: skipped because DB_ROLE_ACCESS_SEED is not YES.`);
    return;
  }

  await ensureTables(['ROLE_ACCESS', 'FORMS', 'ROLES']);

  const now = new Date();
  const forms = await (db as any)
    .selectFrom('FORMS')
    .selectAll()
    .where('active_flag', '=', 1)
    .execute();

  let granted = 0;

  for (const form of forms) {
    const formId = form.form_id as string;
    const formName = form.form_name as string;

    await upsertByMatch({
      table: 'ROLE_ACCESS',
      matchOn: ['role_id', 'form_id'],
      preserveOnUpdate: ['roleaccess_id'],
      row: {
        roleaccess_id: uuidv4(),
        roleaccess_desc: `Full admin access for ${formName}`,
        role_id: ADMIN_ROLE_ID,
        form_id: formId,
        active_flag: 1,
        last_update: now,
        updateby: SYSTEM_UPDATE_BY,
        ...ALL_PERMISSIONS_TRUE,
      },
    });

    granted += 1;
  }

  logDb(`${invocation}: role-access seed complete (${granted} form permissions granted to ${SUPER_ADMIN_ROLE.name}).`);
}

const isDirectInvocation = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectInvocation) {
  runRoleAccessSeed()
    .then(async () => { await db.destroy(); process.exit(0); })
    .catch(async (error) => {
      console.error('[db] Role-access seed failed:', error);
      await db.destroy();
      process.exit(1);
    });
}
