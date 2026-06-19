// Shared response helpers for Lambda handlers
export function ok(body: unknown) {
  return {
    statusCode: 200,
    headers: cors(),
    body: JSON.stringify(body),
  };
}

export function created(body: unknown) {
  return {
    statusCode: 201,
    headers: cors(),
    body: JSON.stringify(body),
  };
}

export function badRequest(message: string) {
  return {
    statusCode: 400,
    headers: cors(),
    body: JSON.stringify({ error: message }),
  };
}

export function unauthorized() {
  return {
    statusCode: 401,
    headers: cors(),
    body: JSON.stringify({ error: 'Unauthorized' }),
  };
}

export function notFound(message = 'Not found') {
  return {
    statusCode: 404,
    headers: cors(),
    body: JSON.stringify({ error: message }),
  };
}

export function serverError(err: unknown) {
  console.error(err);
  return {
    statusCode: 500,
    headers: cors(),
    body: JSON.stringify({ error: 'Internal server error' }),
  };
}

function cors() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  };
}
