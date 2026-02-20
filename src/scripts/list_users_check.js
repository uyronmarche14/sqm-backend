import db from '../config/db.js';

async function listUsers() {
    try {
        const [rows] = await db.query('SELECT ID, Name, Email, Password, RoleID FROM TBL_Users');
        console.log('Users found:', rows.length);
        console.table(rows);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

listUsers();
