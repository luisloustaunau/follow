import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QueryCommand, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo, TABLE } from '../lib/dynamo.js';
import { extractToken } from '../lib/jwt.js';
import { ok, created, unauthorized, notFound, serverError, badRequest } from '../lib/response.js';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (event.httpMethod === 'OPTIONS') return ok({});

    const user = extractToken(event.headers?.Authorization ?? event.headers?.authorization);
    if (!user) return unauthorized();

    const method = event.httpMethod;
    const projectId = event.pathParameters?.projectId;

    // GET /projects
    if (method === 'GET' && !projectId) {
      const result = await dynamo.send(
        new QueryCommand({
          TableName: TABLE,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :type',
          ExpressionAttributeValues: { ':type': 'PROJECT' },
        })
      );
      return ok(result.Items ?? []);
    }

    // GET /projects/:id
    if (method === 'GET' && projectId) {
      const result = await dynamo.send(
        new GetCommand({ TableName: TABLE, Key: { PK: `PROJECT#${projectId}`, SK: '#META' } })
      );
      if (!result.Item) return notFound('Project not found');
      return ok(result.Item);
    }

    // POST /projects (owner only)
    if (method === 'POST') {
      if (user.role !== 'owner') return unauthorized();
      const body = JSON.parse(event.body ?? '{}');
      const { name, contractNo, contractor, amountWithIVA, startDate, endDate, durationDays, advance } = body;
      if (!name || !contractNo) return badRequest('name and contractNo required');

      const id = crypto.randomUUID();
      const item = {
        PK: `PROJECT#${id}`,
        SK: '#META',
        GSI1PK: 'PROJECT',
        id,
        name,
        contractNo,
        contractor,
        amountWithIVA: Number(amountWithIVA),
        startDate,
        endDate,
        durationDays: Number(durationDays),
        advance: advance ? Number(advance) : 0,
        createdAt: new Date().toISOString(),
      };
      await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
      return created(item);
    }

    return badRequest('Unknown route');
  } catch (err) {
    return serverError(err);
  }
}
