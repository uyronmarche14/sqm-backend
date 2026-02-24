import db from '../src/config/db.js';
import bcrypt from 'bcryptjs';

async function seed() {
    try {
        const pool = await db.getPool();

        // 1. Check Roles
        console.log('Checking Roles...');
        const [roles] = await db.query('SELECT * FROM TBL_Roles');
        if (roles.length === 0) {
            console.log('Seeding Roles...');
            await db.query(`
                INSERT INTO TBL_Roles (ID, RoleName, RoleCode, RoleDesc, IsActive, CreateDate, ModifiedDate) VALUES 
                (1, 'Admin', 'ADMIN', 'Administrator', 1, GETDATE(), GETDATE()),
                (2, 'Supplier', 'SUPPLIER', 'Supplier Account', 1, GETDATE(), GETDATE()),
                (3, 'User', 'USER', 'Standard User', 1, GETDATE(), GETDATE())
            `);
            console.log('Roles seeded.');
        } else {
            console.log(`Roles exist: ${roles.length}`);
        }

        // 2. Check Users
        console.log('Checking Users...');
        const [users] = await db.query('SELECT * FROM TBL_Users');
        if (users.length === 0) {
            console.log('Seeding Admin User...');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            // Manual ID = 1
            await db.query(`
                INSERT INTO TBL_Users (ID, Name, Email, Password, RoleID, IsActive, Confirmed, CreateDate, ModifiedDate)
                VALUES (1, 'System Admin', 'admin@example.com', ?, 1, 1, 1, GETDATE(), GETDATE())
            `, [hashedPassword]);
            console.log('Admin user seeded: admin@example.com / admin123');
        } else {
            console.log(`Users exist: ${users.length}`);
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

seed();
