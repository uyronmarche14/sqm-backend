
import { 
    createPartType, createPartDataCategory, createPartMaster, 
    getPartTypes, getPartDataCategories, getPartsCatalog,
    createPart, createSite  // Existing helpers
} from '../src/controllers/masterData.controller.js';
import db from '../src/config/db.js';
import { v4 as uuidv4 } from 'uuid';

const mockRes = {
    status: (code) => {
        console.log(`[Status]: ${code}`);
        return {
            json: (data) => console.log(`[JSON]:`, JSON.stringify(data, null, 2))
        };
    },
    json: (data) => console.log(`[JSON NO STATUS]:`, JSON.stringify(data, null, 2))
};

const runAudit = async () => {
    try {
        console.log('--- 1. Prereqs (Site) ---');
        let siteId;
        const siteCode = `S${Math.floor(Math.random() * 100000)}`;
        await createSite({ body: { site_name: `SITE_${Date.now()}`, site_code: siteCode, site_desc: 'Audit Site' } }, {
            status: (c) => ({ json: (d) => {
                console.log('Created Site (GUID):', d);
                siteId = d.id;
            }})
        });

        console.log('--- 2. Prereqs (AQL) ---');
        const aqlId = uuidv4();
        await db.query(`INSERT INTO dbo.AQL (aql_id, aql_name, minor, major, site_id, aql_desc, creation_date, active_flag, last_update, updateby)
                        VALUES (?, 'AUDIT AQL ' + '${Date.now()}', 0.1, 0.4, ?, 'Desc', GETDATE(), 1, GETDATE(), 'SYSTEM')`, [aqlId, siteId]);
        console.log('Created AQL:', aqlId);

        console.log('--- 3. Create Part Type ---');
        const typeName = `TYPE_${Date.now()}`;
        const typeCode = `T${Math.floor(Math.random() * 100000)}`;
        let typeId;
        
        await createPartType({ body: { parttype_name: typeName, parttype_code: typeCode, parttype_desc: 'Test Type' } }, {
            status: (c) => ({ json: (d) => { 
                console.log('Created Type:', d); 
                typeId = d.id; 
            }})
        });

        console.log('--- 4. Create Part Class ---');
        let classId;
        await createPart({ body: { part_name: `CLASS_${Date.now()}`, part_desc: 'Test Class', site_id: siteId } }, {
             status: (c) => ({ json: (d) => {
                 console.log('Created Class:', d);
                 classId = d.id;
             }})
        });

        console.log('--- 5. Create Master Part (Catalog) ---');
        let partId;
        await createPartMaster({ 
            body: { 
                code: `PRT-${Date.now()}`, 
                name: 'TEST PART MASTER', 
                siteId: siteId, 
                classId: classId, 
                typeId: typeId, 
                aqlId: aqlId 
            } 
        }, {
            status: (c) => ({ json: (d) => {
                console.log('Created Master Part:', d);
                partId = d.id;
            }})
        });

        console.log('--- 6. Create Part Data Category ---');
        await createPartDataCategory({
            body: {
                name: 'TEST DATA CAT',
                parentId: partId,
                min: 10,
                max: 20,
                description: 'Measurement'
            }
        }, mockRes);

        console.log('--- AUDIT COMPLETE ---');
        process.exit(0);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

runAudit();
