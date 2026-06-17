export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const entry = {
      level: payload.level || 'error',
      message: String(payload.message || 'Client error'),
      context: payload.context || {},
      path: payload.path,
      userAgent: payload.userAgent,
      timestamp: new Date().toISOString(),
    };

    console.error('[client-error]', JSON.stringify(entry));
  } catch (err) {
    console.error('[client-error] malformed payload', err);
  }

  return { statusCode: 204 };
}
