const https = require('https');
const http = require('http');

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  const NGROK_URL = process.env.NGROK_URL;

  if (!NGROK_URL) {
    return {
      statusCode: 503,
      headers: cors,
      body: JSON.stringify({ error: 'NGROK_URL not set in Netlify environment variables' })
    };
  }

  try {
    const targetUrl = NGROK_URL.replace(/\/$/, '') + '/bina';
    const body = event.body || '{}';

    const result = await new Promise((resolve, reject) => {
      const url = new URL(targetUrl);
      const lib = url.protocol === 'https:' ? https : http;
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': '1',
          'Content-Length': Buffer.byteLength(body)
        }
      };

      const req = lib.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });

      req.on('error', reject);
      req.setTimeout(20000, () => { req.destroy(); reject(new Error('timeout')); });
      req.write(body);
      req.end();
    });

    return {
      statusCode: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: result.body
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: cors,
      body: JSON.stringify({ error: err.message })
    };
  }
};
