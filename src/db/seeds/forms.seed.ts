import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'node:url';

import { getPageRegistryEntries } from '@sqm/permissions-contract';
import { db } from '../../shared/infrastructure/db.js';
import { logDb } from '../lib/db-safety.js';
import { ensureTables, isYes, SYSTEM_UPDATE_BY, upsertByMatch } from './helpers.js';

export async function runFormsSeed(invocation = 'db:seed:forms') {
  if (!isYes(process.env.DB_FORMS_SEED)) {
    logDb(`${invocation}: skipped because DB_FORMS_SEED is not YES.`);
    return;
  }

  await ensureTables(['FORMS']);

  const now = new Date();
  const entries = getPageRegistryEntries();

  for (const entry of entries) {
    await upsertByMatch({
      table: 'FORMS',
      matchOn: ['form_name'],
      preserveOnUpdate: ['form_id'],
      row: {
        form_id: uuidv4(),
        form_name: entry.formCode,
        form_url: entry.kind === 'internal' ? '' : entry.route,
        menu_group: entry.menuGroup,
        icon: '',
        form_desc: entry.title || '',
        active_flag: 1,
        last_update: now,
        updateby: SYSTEM_UPDATE_BY,
      },
    });
  }

  logDb(
    `${invocation}: forms seed complete (${entries.length} entries, ` +
    `explicit=${entries.filter((e) => e.kind === 'page').length}, ` +
    `internal=${entries.filter((e) => e.kind === 'internal').length}).`,
  );
}

const isDirectInvocation = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectInvocation) {
  runFormsSeed()
    .then(async () => { await db.destroy(); process.exit(0); })
    .catch(async (error) => {
      console.error('[db] Forms seed failed:', error);
      await db.destroy();
      process.exit(1);
    });
}
