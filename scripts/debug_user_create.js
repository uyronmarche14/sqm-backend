import fetch from 'node-fetch';

async function testCreateUser() {
    try {
        const response = await fetch('http://localhost:3001/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                full_name: "Test User 500",
                email: "test500@example.com",
                password: "password123",
                role_id: 3, // User
                site_id: null,
                active_flag: 1
            })
        });

        const status = response.status;
        const text = await response.text();
        
        console.log(`Status: ${status}`);
        console.log(`Body: ${text}`);

    } catch (error) {
        console.error('Error:', error);
    }
}

testCreateUser();
