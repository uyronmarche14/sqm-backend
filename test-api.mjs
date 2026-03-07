import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/sqmp?status=issued',
  method: 'GET',
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    try {
        console.log(JSON.stringify(JSON.parse(data), null, 2));
    } catch {
        console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.end();
