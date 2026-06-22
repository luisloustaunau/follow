import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  QueryCommand,
  PutCommand,
  GetCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { dynamo, TABLE } from '../lib/dynamo.js';
import { extractToken } from '../lib/jwt.js';
import {
  ok,
  created,
  unauthorized,
  serverError,
  badRequest,
} from '../lib/response.js';
import { generateSchedule } from '../lib/schedule.js';

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    if (event.httpMethod === 'OPTIONS') return ok({});

    const user = extractToken(
      event.headers?.Authorization ?? event.headers?.authorization
    );
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
      const { name, location, supervisorId, amount } = body;
      if (!name) return badRequest('name required');

      // Most common case: one front handles the whole contract. UI can
      // override with a smaller amount for multi-front projects.
      const project = await dynamo.send(
        new GetCommand({
          TableName: TABLE,
          Key: { PK: `PROJECT#${projectId}`, SK: '#META' },
        })
      );
      if (!project.Item) return badRequest('Project not found');
      const scheduleAmount = Number(amount ?? project.Item.amountWithIVA ?? 0);

      const id = crypto.randomUUID();
      const item = {
        PK: `PROJECT#${projectId}`,
        SK: `FRONT#${id}`,
        GSI1PK: 'FRONT',
        id,
        projectId,
        name,
        location: location ?? '',
        supervisorId: supervisorId ?? '',
        amount: scheduleAmount,
        createdAt: new Date().toISOString(),
      };
      await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));

      // Auto-seed the schedule using project contract dates
      const rows = generateSchedule(
        String(project.Item.startDate),
        String(project.Item.endDate),
        scheduleAmount
      );
      for (let i = 0; i < rows.length; i += 25) {
        const chunk = rows.slice(i, i + 25);
        await dynamo.send(
          new BatchWriteCommand({
            RequestItems: {
              [TABLE]: chunk.map((r) => ({
                PutRequest: {
                  Item: {
                    PK: `FRONT#${id}`,
                    SK: `SCHED#W${String(r.weekNo).padStart(3, '0')}`,
                    frontId: id,
                    ...r,
                  },
                },
              })),
            },
          })
        );
      }

      return created({ ...item, scheduleRows: rows.length });
    }

    return badRequest('Unknown route');
  } catch (err) {
    return serverError(err);
  }
}
