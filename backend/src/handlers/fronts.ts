import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo, TABLE } from '../lib/dynamo.js';
import { extractToken } from '../lib/jwt.js';
import { ok, created, unauthorized, serverError, badRequest } from '../lib/response.js';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (event.httpMethod === 'OPTIONS') return ok({});

    const user = extractToken(event.headers?.Authorization ?? event.headers?.authorization);
    if (!user) return unauthorized();

    const method = event.httpMethod;
    const { projectId } = event.pathParameters ?? {};

    // GET /projects/:projectId/fronts
    if (method === 'GET' && projectId) {
      const result = await dynamo.send(
        new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: {
            ':pk': `PROJECT#${projectId}`,
            ':prefix': 'FRONT#',
          },
        })
      );
      return ok(result.Items ?? []);
    }

    // POST /projects/:projectId/fronts
    if (method === 'POST' && projectId) {
      if (user.role !== 'owner') return unauthorized();
      const body = JSON.parse(event.body ?? '{}');
      const { name, location, supervisorId } = body;
      if (!name) return badRequest('name required');

      const id = crypto.randomUUID();
      const item = {
        PK: `PROJECT#${projectId}`,
        SK: `FRONT#${id}`,
        GSI1PK: `FRONT`,
        id,
        projectId,
        name,
        location: location ?? '',
        supervisorId: supervisorId ?? '',
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
