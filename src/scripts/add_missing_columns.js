import db, { sql } from '../config/db.js';

async function addMissingColumns() {
    try {
        const pool = await db.getPool();
        console.log('🔄 Adding missing columns to TBL_ tables...');

        const updates = [
            // TBL_Site
            { table: 'TBL_Site', col: 'SiteCode', type: 'VARCHAR(50)' },
            { table: 'TBL_Site', col: 'SiteDesc', type: 'VARCHAR(200)' },
            
            // TBL_Suppliers
            { table: 'TBL_Suppliers', col: 'SupplierCode', type: 'VARCHAR(50)' },
            { table: 'TBL_Suppliers', col: 'ContactPerson', type: 'VARCHAR(100)' },
            { table: 'TBL_Suppliers', col: 'Email', type: 'VARCHAR(100)' },
            { table: 'TBL_Suppliers', col: 'Address', type: 'VARCHAR(255)' },
            { table: 'TBL_Suppliers', col: 'Location', type: 'VARCHAR(100)' }, // Just in case
            
            // TBL_Items (Products) - If TBL_Items is Products? 
            // Controller uses TBL_Items for Products? 
            // In init_master.js TBL_Items was defined as: ItemCode, ItemName. 
            // Frontend: ProductCode, ProductName.
            // If TBL_Items IS Products, it has ItemCode.
            // I should alias it in controller.
            
            // TBL_Model
            { table: 'TBL_Model', col: 'ModelCode', type: 'VARCHAR(50)' },
            { table: 'TBL_Model', col: 'ProductID', type: 'INT' }, // or NVARCHAR if referenced TBL_Items.ID is INT
            
            // TBL_Class (PartTypes??) or TBL_Part?
            // TBL_Part doesn't exist in generated split? 
            // serveDB.md showed dbo.PARTS.
            // init_master.js didn't show TBL_Part? 
            // init_master.js has TBL_Items, TBL_Model, TBL_Class, TBL_Commodity.
            // Maybe TBL_Items = Parts? TBL_Commodity = ??
            // Using logic: FiveM1E uses TBL_Items.
        ];

        for (const up of updates) {
            try {
                // Check if column exists
                const check = await pool.query(`
                    SELECT 1 FROM sys.columns 
                    WHERE Name = N'${up.col}' 
                    AND Object_ID = Object_ID(N'dbo.${up.table}')
                `);
                
                if (check.recordset.length === 0) {
                    console.log(`➕ Adding ${up.col} to ${up.table}...`);
                    await pool.query(`ALTER TABLE dbo.${up.table} ADD ${up.col} ${up.type} NULL`);
                } else {
                    console.log(`✅ ${up.table}.${up.col} exists.`);
                }
            } catch (err) {
                console.error(`❌ Failed to update ${up.table}: ${err.message}`);
            }
        }

        console.log('✅ Columns checked/added.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

addMissingColumns();
