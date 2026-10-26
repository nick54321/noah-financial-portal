const crypto = require('crypto');
const axios = require('axios');

const NOAH_BASE_URL = process.env.NOAH_BASE_URL || 'https://api.noah.com/v1';
const NOAH_API_KEY = process.env.NOAH_API_KEY;

function getFormattedPrivateKey() {
  let key = process.env.NOAH_API_SIGN_PRIVATE_KEY || '';
  if (!key) return '';
  
  // Clean up quotes and handle newlines
  key = key.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  key = key.replace(/\\n/g, '\n');
  return key;
}

function base64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createJwtSignature(method, path, queryParams, bodyBuffer) {
  const header = { alg: 'ES384', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);

  let bodyHash;
  if (bodyBuffer && bodyBuffer.length > 0) {
    bodyHash = crypto.createHash('sha256').update(bodyBuffer).digest('hex');
  }

  const payload = {
    aud: 'https://api.noah.com',
    iat: now,
    exp: now + 300,
    method: method.toUpperCase(),
    path,
    ...(queryParams && Object.keys(queryParams).length > 0 ? { queryParams } : {}),
    ...(bodyHash ? { bodyHash } : {}),
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const message = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('SHA384');
  signer.update(message);
  const privateKey = getFormattedPrivateKey();
  const signature = signer.sign({
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  });

  return `${message}.${base64url(signature)}`;
}

async function request(method, endpoint, queryParams = null, bodyData = null) {
  const path = endpoint.startsWith('/v1') ? endpoint : `/v1${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  let queryString = '';
  if (queryParams && Object.keys(queryParams).length > 0) {
    queryString = '?' + new URLSearchParams(queryParams).toString();
  }

  const url = `${NOAH_BASE_URL.replace(/\/v1$/, '')}${path}${queryString}`;

  let bodyBuffer = null;
  if (bodyData !== null && bodyData !== undefined) {
    bodyBuffer = Buffer.from(JSON.stringify(bodyData));
  }

  const jwtSig = createJwtSignature(method, path, queryParams, bodyBuffer);

  const headers = {
    'X-Api-Key': NOAH_API_KEY,
    'Api-Signature': jwtSig,
    ...(bodyBuffer ? { 'Content-Type': 'application/json' } : {}),
  };

  try {
    const response = await axios({
      method,
      url,
      headers,
      data: bodyBuffer,
    });
    return response.data;
  } catch (err) {
    if (err.response) {
      console.error(`Noah API Error [${method} ${path}]:`, err.response.status, err.response.data);
      const error = new Error(err.response.data?.Detail || err.response.data?.Type || 'Noah API Error');
      error.status = err.response.status;
      error.details = err.response.data;
      throw error;
    }
    console.error(`Noah API Network Error [${method} ${path}]:`, err.message);
    throw err;
  }
}

module.exports = {
  request,
  get: (endpoint, queryParams) => request('GET', endpoint, queryParams),
  post: (endpoint, body, queryParams) => request('POST', endpoint, queryParams, body),
  put: (endpoint, body, queryParams) => request('PUT', endpoint, queryParams, body),
  delete: (endpoint, queryParams) => request('DELETE', endpoint, queryParams),
};
