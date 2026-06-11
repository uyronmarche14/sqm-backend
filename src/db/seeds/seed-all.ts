import { fileURLToPath } from 'node:url';

import { db } from '../../shared/infrastructure/db.js';
import { logDb } from '../lib/db-safety.js';
import { runAdminSeed } from './admin.seed.js';
import { runFormsSeed } from './forms.seed.js';
import { runReferenceSeed } from './reference.seed.js';
import { runRoleAccessSeed } from './role-access.seed.js';

async function runAllSeeds() {
  logDb('seed-all: starting sequential seed run...');

  await runAdminSeed('seed-all:admin');
  logDb('seed-all: admin seed finished.');

  await runFormsSeed('seed-all:forms');
  logDb('seed-all: forms seed finished.');

  await runRoleAccessSeed('seed-all:role-access');
  logDb('seed-all: role-access seed finished.');

  await runReferenceSeed('seed-all:reference');
  logDb('seed-all: reference seed finished.');

  logDb('seed-all: complete.');
}

const isDirectInvocation = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectInvocation) {
  runAllSeeds()
    .then(async () => { await db.destroy(); process.exit(0); })
    .catch(async (error) => {
      console.error('[db] seed-all failed:', error);
      await db.destroy();
      process.exit(1);
    });
}
