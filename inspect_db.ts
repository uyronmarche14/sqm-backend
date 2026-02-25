import { db } from './src/shared/infrastructure/db.js';

async function checkUsers() {
    try {
        console.log("Fetching a single user to inspect columns...");
        // Using sql raw to bypass TS typings momentarily
        const { rows } = await db.executeQuery<{ [key: string]: any }>(
            // We use raw sql because we want to see the exact casing of columns returned by MSSQL
            // Note: executeQuery takes a CompiledQuery
            import('kysely').then(k => k.sql`SELECT TOP 1 * FROM USERS`.compile(db)) as any
        );

        console.log("DATABASE ROW KEYS:", Object.keys(rows[0] || {}));
        console.log("SAMPLE ROW:", rows[0]);

        const admin = await db.executeQuery<{ [key: string]: any }>(
            import('kysely').then(k => k.sql`SELECT * FROM USERS WHERE email = 'admin@sqm.com'`.compile(db)) as any
        );
        console.log("ADMIN ROW:", admin.rows[0]);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

// Simplified query execution
import { sql } from 'kysely';
db.executeQuery(sql`SELECT TOP 1 * FROM USERS`.compile(db)).then(res => {
    console.log("KEYS:", Object.keys(res.rows[0] || {}));
    console.log("VALUES:", res.rows[0]);
    
    db.executeQuery(sql`SELECT * FROM USERS WHERE email = 'admin@sqm.com'`.compile(db)).then(res2 => {
        console.log("ADMIN ROW:", res2.rows[0]);
        process.exit(0);
    });
});
