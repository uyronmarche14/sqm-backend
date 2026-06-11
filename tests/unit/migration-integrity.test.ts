import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getProjectRoot(): string {
  return path.resolve(__dirname, '../..');
}

function findDownFiles(dir: string, upName: string): boolean {
  const downName = upName.replace(/\.sql$/, '.down.sql');
  const dirs = [
    path.join(dir, 'src/db/migrations'),
    path.join(dir, 'src/db/legacy'),
    path.join(dir, 'db-assets/manual-migrations'),
  ];

  for (const searchDir of dirs) {
    const filePath = path.join(searchDir, downName);
    if (fs.existsSync(filePath)) {
      return true;
    }
  }

  return false;
}

describe('Migration integrity', () => {
  const root = getProjectRoot();
  const migrationUtilsPath = path.join(root, 'src/db/lib/migration-utils.ts');
  const migrationUtils = fs.readFileSync(migrationUtilsPath, 'utf-8');

  const safeFileMatches = migrationUtils.matchAll(/migration_add_[\w]+\.sql/g);
  const safeFiles = [...new Set([...safeFileMatches].map((m) => m[0]))];

  it('all safe migrations have corresponding .down.sql files', () => {
    const missingDownFiles = safeFiles.filter((f) => !findDownFiles(root, f));
    expect(missingDownFiles).toEqual([]);
  });

  it('all safe migration files exist on disk', () => {
    const searchDirs = [
      path.join(root, 'src/db/migrations'),
      path.join(root, 'src/db/legacy'),
    ];

    const missingFiles = safeFiles.filter((f) => {
      return !searchDirs.some((dir) => fs.existsSync(path.join(dir, f)));
    });

    expect(missingFiles).toEqual([]);
  });

  it('SAFE_MIGRATION_FILES array has no duplicates', () => {
    expect(safeFiles.length).toBe(new Set(safeFiles).size);
  });

  it('SSI migration is in the SAFE_MIGRATION_FILES list', () => {
    expect(safeFiles).toContain('migration_add_ssi_module.sql');
  });

  it('SSI down migration exists', () => {
    const ssiDownExists = findDownFiles(root, 'migration_add_ssi_module.sql');
    expect(ssiDownExists).toBe(true);
  });

  it('SSI up migration exists in src/db/migrations/', () => {
    const ssiPath = path.join(root, 'src/db/migrations', 'migration_add_ssi_module.sql');
    expect(fs.existsSync(ssiPath)).toBe(true);
  });

  it('generated schema files list does not have unexpected gaps', () => {
    const generatedDir = path.join(root, 'db-assets/generated');
    if (!fs.existsSync(generatedDir)) {
      return;
    }

    const schemaFiles = fs
      .readdirSync(generatedDir)
      .filter((f) => f.startsWith('schema-') && f.endsWith('.sql'))
      .map((f) => f.replace(/^schema-/, '').replace(/\.sql$/, ''));

    // Expect SSI to NOT be in generated schemas (it's a manual migration)
    // But should be in safe migrations
    expect(schemaFiles).not.toContain('ssi');
    expect(safeFiles).toContain('migration_add_ssi_module.sql');
  });
});
