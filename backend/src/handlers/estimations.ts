import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QueryCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo, TABLE } from '../lib/dynamo.js';
import { extractToken } from '../lib/jwt.js';
import { ok, created, unauthorized, serverError, badRequest } from '../lib/response.js';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (event.httpMethod === 'OPTIONS') return ok({});

    const user = extractToken(event.headers?.Authorization ?? event.headers?.authorization);
    if (!user) return unauthorized();

    const method = event.httpMethod;
    const { projectId, estId } = event.pathParameters ?? {};
    if (!projectId) return badRequest('projectId required');

    // GET /projects/:projectId/estimations
    if (method === 'GET') {
      const result = await dynamo.send(
        new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: {
            ':pk': `PROJECT#${projectId}`,
            ':prefix': 'ESTIMATION#',
          },
          ScanIndexForward: true,
        })
      );
      return ok(result.Items ?? []);
    }

    // POST /projects/:projectId/estimations (owner only)
    if (method === 'POST') {
      if (user.role === 'supervisor') return unauthorized();
      const body = JSON.parse(event.body ?? '{}');
      const { estimationNo, period, periodMonth, amount, deductions } = body;
      if (!estimationNo || !periodMonth) return badRequest('estimationNo and periodMonth required');

      const id = crypto.randomUUID();
      const amt = Number(amount ?? 0);
      const ded = Number(deductions ?? 0);
      const amtIVA = amt * 1.16;
      const liquid = amtIVA - ded;

      const item = {
        PK: `PROJECT#${projectId}`,
        SK: `ESTIMATION#${periodMonth}`,
        id,
        projectId,
        estimationNo,
        period,
        periodMonth,
        amount: amt,
        deductions: ded,
        amountWithIVA: amtIVA,
        liquid,
        invoiceNo: body.invoiceNo ?? null,
        status: 'POR_INGRESAR',
        submittedDate: body.submittedDate ?? null,
        paidDate: null,
        createdAt: new Date().toISOString(),
      };
      await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
      return created(item);
    }

    // PUT /projects/:projectId/estimations/:estId (billing or owner)
    if (method === 'PUT' && estId) {
      if (user.role === 'supervisor') return unauthorized();
      const body = JSON.parse(event.body ?? '{}');

      const updateExpr: string[] = [];
      const exprVals: Record<string, unknown> = {};

      const fields: Array<{ key: string; attr: string }> = [
        { key: 'status', attr: ':status' },
        { key: 'invoiceNo', attr: ':invoiceNo' },
        { key: 'paidDate', attr: ':paidDate' },
        { key: 'submittedDate', attr: ':submittedDate' },
        { key: 'deductions', attr: ':deductions' },
        { key: 'liquid', attr: ':liquid' },
      ];

      for (const { key, attr } of fields) {
        if (body[key] !== undefined) {
          updateExpr.push(`${key} = ${attr}`);
          exprVals[attr] = body[key];
        }
      }
      if (!updateExpr.length) return badRequest('Nothing to update');

      await dynamo.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { PK: `PROJECT#${projectId}`, SK: `ESTIMATION#${estId}` },
          UpdateExpression: `SET ${updateExpr.join(', ')}`,
          ExpressionAttributeValues: exprVals,
        })
      );
      return ok({ ...body, id: estId });
    }

    return badRequest('Unknown route');
  } catch (err) {
    return serverError(err);
  }
}
