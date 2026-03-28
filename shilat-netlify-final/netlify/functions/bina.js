const https = require('https');

const BINA_URL = 'https://webfiles.binaw.com/post/PostJsonDocV2.aspx';
const TOKEN    = '76b37357660475442296bc1b40140c54a63711ceacee30002af04286f21fc460-Shilat3583';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type, X-Target-Url, Authorization'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ok', service: 'shilat-bina-proxy' })
    };
  }
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: 'Method not allowed' };
  }

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf8')
      : (event.body || '{}');

    let payload = {};
    try { payload = JSON.parse(rawBody); } catch(e) {}

    // Always inject token
    payload.tokenId = TOKEN;

    const bodyStr = JSON.stringify(payload);
    console.log('Bina request:', bodyStr.slice(0, 150));

    const result = await callBina(BINA_URL, bodyStr);
    console.log('Bina response:', result.slice(0, 200));

    // Try to parse and return structured response
    let parsed = { type: 'unknown', items: [] };
    try {
      const pj = JSON.parse(result);
      const items = Array.isArray(pj) ? pj : (pj.items || []);
      parsed = { type: 'json', items };
    } catch(e) {
      if (result.startsWith('*')) {
        parsed = { type: 'bina_star', items: [], count: result.split('*').length };
      }
    }

    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, parsed, raw: result })
    };
  } catch (err) {
    console.error('Error:', err.message);
    return {
      statusCode: 502,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};

function callBina(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const buf = Buffer.from(body, 'utf8');
    const req = https.request({
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: 'POST',
      timeout: 25000,
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': buf.length,
        'User-Agent':     'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept':         'application/json, text/plain, */*',
        'Origin':         'https://webapps.binaw.com',
        'Referer':        'https://webapps.binaw.com/'
      }
    }, res => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.write(buf);
    req.end();
  });
}
