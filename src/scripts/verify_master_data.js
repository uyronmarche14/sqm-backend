
// Direct Controller Test


// Minimal Server Mock to run app logic? 
// No, simpler to just run the script against the server IF running.
// If server not running, I can try to require controller + mockReq/Res like before.
// But the user issue is likely full stack.
// Let's stick to Mocking for "Logic Verification" first since I can't guarantee server port 3001 is open for me.
// Wait, I can use the existing `masterData.controller.js` and `mockRes` approach.

import { getSites, getSuppliers } from '../controllers/masterData.controller.js';
import db from '../config/db.js';

const mockRes = () => {
    return {
        statusCode: 200,
        headers: {},
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.data = data;
            return this;
        },
        send(data) {
            this.data = data;
            return this;
        }
    };
};

const runTest = async () => {
    console.log('--- TESTING MASTER DATA API LOGIC ---');
    try {
        const pool = await db.getPool(); // Ensure DB is connected
        
        console.log('\n--- Checking Tables ---');
        const tables = ['SUPPLIERS', 'USERS', 'TBL_Suppliers', 'TBL_Users'];
        
        for (const table of tables) {
            try {
                await pool.request().query(`SELECT TOP 1 * FROM ${table}`);
                console.log(`✅ ${table} table EXISTS`);
            } catch (e) { 
                console.log(`❌ ${table} table does NOT exist or error:`, e.message); 
            }
        }
        
        console.log('--- Done Checking ---');
        process.exit(0);

    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
       process.exit(0);
    }
};

runTest();
