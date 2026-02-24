

const BASE_URL = 'http://localhost:3001/api/mnr';

const payload = {
    supplier: "Test Supplier",
    mfgSites: "Test Site",
    attention: "Mr. Tester",
    model: "Test Model",
    mfgAreas: "Assembly",
    category: "Material",
    mnrType: "Standard",
    reportIssuance8D: true,
    issueDate: "2025-01-01",
    initialReport: "2025-01-02",
    dueDate: "2025-01-10",
    remarks: "Test Remarks",
    reference: "Test Ref",
    disposition_data: {}, productId: "Test Product ID",
    nonConformity: {
        partsCode: "PN-123",
        partsName: "Widget A",
        defectName: "Scratch",
        classification: "Major",
        ngQty: 10
    },
    response8D: {
        d1_teamApproach: "Legacy Team"
    }
};

async function test() {
    try {
        console.log('Posting to', BASE_URL);
        const res = await fetch(BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        console.log('Status:', res.status);
        const json = await res.json();
        console.log('Response:', json);
        
        if (res.status === 201) {
             const id = json.id;
             console.log('Fetching created record:', id);
             const getRes = await fetch(`${BASE_URL}/${id}`);
             const getJson = await getRes.json();
             console.log('Fetched:', getJson);
        }
    } catch (e) {
        console.error(e);
    }
}
test();
