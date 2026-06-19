import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import bcrypt from 'bcryptjs';
import { dynamo, TABLE } from '../lib/dynamo.js';
import { signToken } from '../lib/jwt.js';
import { ok, unauthorized, badRequest, serverError } from '../lib/response.js';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const path = event.path;
    const method = event.httpMethod;

    // OPTIONS preflight
    if (method === 'OPTIONS') return ok({});

    // POST /auth/login
    if (method === 'POST' && path.endsWith('/login')) {
      const body = JSON.parse(event.body ?? '{}');
      const { email, password } = body;
      if (!email || !password) return badRequest('Email and password required');

      const result = await dynamo.send(
        new GetCommand({ TableName: TABLE, Key: { PK: `USER#${email}`, SK: '#META' } })
      );
      const user = result.Item;
      if (!user) return unauthorized();

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return unauthorized();

      const token = signToken({
        userId: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
      });

      return ok({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
    }

    // POST /auth/register (owner-only, or seed)
    if (method === 'POST' && path.endsWith('/register')) {
      const body = JSON.parse(event.body ?? '{}');
      const { name, email, password, role } = body;
      if (!name || !email || !password || !role) return badRequest('Missing fields');

      const passwordHash = await bcrypt.hash(password, 10);
      const id = crypto.randomUUID();

      await dynamo.send(
        new PutCommand({
          TableName: TABLE,
          ConditionExpression: 'attribute_not_exists(PK)',
          Item: {
            PK: `USER#${email}`,
            SK: '#META',
            id,
            name,
            email,
            role,
            passwordHash,
            createdAt: new Date().toISOString(),
          },
        })
      );

      return ok({ id, name, email, role });
    }

    return badRequest('Unknown route');
  } catch (err) {
    return serverError(err);
  }
}
