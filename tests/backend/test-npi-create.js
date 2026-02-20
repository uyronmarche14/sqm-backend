// test-npi-create.js
// Run with: node tests/backend/test-npi-create.js

import crypto from 'crypto';

async function testCreate() {
    console.log("Testing NPI Create...");

    // Boundary for multipart
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    
    // Construct Body
    let body = '';
    
    const addField = (name, value) => {
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="${name}"\r\n\r\n`;
        body += `${value}\r\n`;
    };

    // Fields
    addField('controlNo', `TEST-${Date.now()}`);
    addField('status', 'DRAFT');
    addField('siteId', '3910F681-42D5-42E3-BACF-06E5570DDAF3'); // Use a valid UUID if possible, or dummy
    addField('supplierId', 'F29B4114-1929-459E-9336-3982F72B5383');
    addField('partId', 'A3B45678-1234-1234-1234-123456789012');
    addField('model', 'M1');
    addField('lotNo', 'L123');
    addField('lotSize', '100');
    addField('invoiceNo', 'INV001');
    addField('inspectionMethod', 'Visual');
    addField('inspectionTemp', '25');
    addField('inspectionHum', '50');
    addField('startTime', '0');
    addField('endTime', '0');
    addField('severity', 'Minor');
    addField('sampleSize', '5');
    addField('disposition', 'Accept');
    addField('inspectionDate', new Date().toISOString());
    addField('deliveryDate', new Date().toISOString());
    addField('inspectedBy', 'Tester');
    addField('createdBy', 'BackTest');

    // Attachments JSON
    const atts = [{ fileName: "test.txt", remarks: "Test File" }];
    addField('attachments', JSON.stringify(atts));

    // End
    body += `--${boundary}--`;

    try {
        const res = await fetch('http://localhost:3001/api/npi', {
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            body: body
        });

        const json = await res.json();
        console.log("Status:", res.status);
        console.log("Response:", json);
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

testCreate();
