import { Database } from 'sqlite-async';

async function check() {
    try {
        const db = await Database.open('./database.sqlite');
        const rows = await db.all("SELECT qmqa_id, request_status FROM QMQA WHERE qmqa_id='6eea41f3-8b23-414f-9cf0-b6c3c97ff5c0'");
        console.log(rows);
    } catch(e){
        console.error(e);
    }
}
check();
