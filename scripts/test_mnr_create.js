const payload = {
    mfgSites: 'Test Site',
    supplier: 'Test Supplier ID', 
    attention: 'Mr. Tester',
    model: 'Test Model',
    mfgAreas: 'Assembly',
    category: 'Material',
    mnrType: 'Standard',
    reportIssuance8D: true,
    recurrenceRef: 'REF-123',
    issueDate: '2025-01-01',
    initialReport: '2025-01-02',
    dueDate: '2025-01-10',
    remarks: 'Test Remarks',
    reference: 'Test Reference',
    nonConformity: {
        partsCode: 'PN-123',
        partsName: 'Widget A',
        defectName: 'Scratch',
        classification: 'Major',
        ngQty: 10
    },
    // Response 8D (Testing missing feature in Create)
    response8D: {
        d1_teamApproach: 'Team A'
    }
};

async function testCreate() {
    try {
        console.log('Posting to http://localhost:3001/api/mnr...');
        const response = await fetch('http://localhost:3001/api/mnr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const contentType = response.headers.get('content-type');
        console.log('Status:', response.status);
        console.log('Content-Type:', contentType);

        if (contentType && contentType.includes('application/json')) {
             const data = await response.json();
             console.log('Response JSON:', JSON.stringify(data, null, 2));
        } else {
             const text = await response.text();
             console.log('Response Text:', text.substring(0, 500)); // First 500 chars
        }

    } catch (error) {
        console.error('Fetch Error:', error);
    }
}

testCreate();
