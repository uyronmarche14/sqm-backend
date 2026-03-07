import { db } from './src/shared/infrastructure/db.js';

async function check() {
    try {
        const result = await db.selectFrom('QMQA').selectAll().where('qmqa_id', '=', '6eea41f3-8b23-414f-9cf0-b6c3c97ff5c0').executeTakeFirst();
        console.log("Record:", result);
    } catch(e){
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();
