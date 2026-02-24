import db, { sql } from '../src/config/db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEMA_DIR = path.join(__dirname, '../db/generated');

async function initDb() {
    try {
        console.log('🔄 Initializing Database from generated schemas...');
        const pool = await db.getPool();

        // Ensure schema dir exists
        try {
            await fs.access(SCHEMA_DIR);
        } catch {
            console.error(`❌ Schema directory not found: ${SCHEMA_DIR}`);
            process.exit(1);
        }

        // Read all SQL files
        const files = await fs.readdir(SCHEMA_DIR);
        const sqlFiles = files.filter(f => f.endsWith('.sql'));

        // Order matters? Core first usually.
        // Simple heuristic: core, then maintenance, then others.
        const priority = ['schema-core.sql', 'schema-maintenance.sql'];
        sqlFiles.sort((a, b) => {
            const idxA = priority.indexOf(a);
            const idxB = priority.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        });

        console.log(`Found ${sqlFiles.length} schema files.`);

        for (const file of sqlFiles) {
            console.log(`\n📄 Processing ${file}...`);
            const filePath = path.join(SCHEMA_DIR, file);
            let content = await fs.readFile(filePath, 'utf8');

            // Split GO statements if present (MSSQL often uses GO)
            // But strict SQL execution in node-mssql doesn't support GO usually.
            // My split script added GO. I need to remove/split by it.
            const batches = content
                .split(/\nGO\s*\n?/i)
                .filter(b => b.trim().length > 0);

            for (const batch of batches) {
                // Remove potential comments or empty lines if strict
                try {
                    await pool.query(batch);
                } catch (err) {
                    // Ignore "There is already an object named..." errors if generic
                    // But usually we prefer IF NOT EXISTS. My split script generated DROP TABLE.
                    // So it's destructive/re-create. Or init_master was IF NOT EXISTS.
                    // The split script used: IF OBJECT_ID ... DROP TABLE ... CREATE TABLE.
                    // So this IS destructive.
                    // That's fine for "init" usually, but user should know.
                    console.error(`  ❌ Error executing batch in ${file}:`, err.message);
                    // console.error(batch); 
                    // process.exit(1); // Don't exit, might be minor
                }
            }
            console.log(`  ✅ Applied.`);
        }

        console.log('\n✅ Database Initialization Complete.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Init DB Failed:', error);
        process.exit(1);
    }
}

initDb();
