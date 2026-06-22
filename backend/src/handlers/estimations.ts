import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  QueryCommand,
  PutCommand,
  UpdateCommand,
  BatchWriteCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';
import { dynamo, TABLE } from '../lib/dynamo.js';
import { extractToken } from '../lib/jwt.js';
import {
  ok,
  created,
  unauthorized,
  serverError,
  badRequest,
  notFound,
} from '../lib/response.js';
import { generateMonthProgram, MonthProgramRow } from '../lib/schedule.js';

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
    const { projectId, estId } = event.pathParameters ?? {};
    const path = event.resource ?? event.path;
    if (!projectId) return badRequest('projectId required');

    // ── /projects/:projectId/estimation-program ───────────────────
    if (path.includes('/estimation-program')) {
      if (method === 'GET') {
        const result = await dynamo.send(
          new QueryCommand({
            TableName: TABLE,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
            ExpressionAttributeValues: {
              ':pk': `PROJECT#${projectId}`,
              ':prefix': 'MONTHPROG#',
            },
          })
        );
        return ok(result.Items ?? []);
      }
      if (method === 'POST') {
        if (user.role !== 'owner') return unauthorized();
        const body = JSON.parse(event.body ?? '{}');
        let rows: MonthProgramRow[] = [];
        if (Array.isArray(body.rows) && body.rows.length > 0) {
          rows = (body.rows as Record<string, unknown>[])
            .map((r) => ({
              month: String(r.month ?? r.periodMonth ?? '').slice(0, 7),
              monthLabel: String(r.monthLabel ?? r.label ?? r.month ?? ''),
              amount: Number(r.amount ?? 0),
              pct: Number(r.pct ?? 0),
              daysInWindow: Number(r.daysInWindow ?? 0),
            }))
            .filter((r) => /^\d{4}-\d{2}$/.test(r.month));
        } else if (body.autoSeed) {
          const project = await dynamo.send(
            new GetCommand({
              TableName: TABLE,
              Key: { PK: `PROJECT#${projectId}`, SK: '#META' },
            })
          );
          if (!project.Item) return notFound('Project not found');
          rows = generateMonthProgram(
            String(project.Item.startDate),
            String(project.Item.endDate),
            Number(project.Item.amountWithIVA)
          );
        } else {
          return badRequest('rows[] or autoSeed required');
        }
        // wipe + write
        const existing = await dynamo.send(
          new QueryCommand({
            TableName: TABLE,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
            ExpressionAttributeValues: {
              ':pk': `PROJECT#${projectId}`,
              ':prefix': 'MONTHPROG#',
            },
            ProjectionExpression: 'PK, SK',
          })
        );
        const items = existing.Items ?? [];
        for (let i = 0; i < items.length; i += 25) {
          const chunk = items.slice(i, i + 25);
          await dynamo.send(
            new BatchWriteCommand({
              RequestItems: {
                [TABLE]: chunk.map((it) => ({
                  DeleteRequest: { Key: { PK: it.PK, SK: it.SK } },
                })),
              },
            })
          );
        }
        for (let i = 0; i < rows.length; i += 25) {
          const chunk = rows.slice(i, i + 25);
          await dynamo.send(
            new BatchWriteCommand({
              RequestItems: {
                [TABLE]: chunk.map((r) => ({
                  PutRequest: {
                    Item: {
                      PK: `PROJECT#${projectId}`,
                      SK: `MONTHPROG#${r.month}`,
                      projectId,
                      ...r,
                    },
                  },
                })),
              },
            })
          );
        }
        return created({ count: rows.length, rows });
      }
    }

    // ── /projects/:projectId/estimations ──────────────────────────
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

    if (method === 'POST') {
      if (user.role === 'supervisor') return unauthorized();
      const body = JSON.parse(event.body ?? '{}');
      const { estimationNo, period, periodMonth, amount, deductions } = body;
      if (!estimationNo || !periodMonth)
        return badRequest('estimationNo and periodMonth required');

      const id = crypto.randomUUID();
      const amt = Number(amount ?? 0);
      const ded = Number(deductions ?? 0);
      const amtIVA = Number((amt * 1.16).toFixed(2));
      const liquid = Number((amtIVA - ded).toFixed(2));

      const item = {
        PK: `PROJECT#${projectId}`,
        SK: `ESTIMATION#${periodMonth}#${id}`,
        GSI1PK: 'ESTIMATION',
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

    if (method === 'PUT' && estId) {
      if (user.role === 'supervisor') return unauthorized();
      const body = JSON.parse(event.body ?? '{}');

      // Find by id (SK contains id at the end)
      const all = await dynamo.send(
        new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: {
            ':pk': `PROJECT#${projectId}`,
            ':prefix': 'ESTIMATION#',
          },
        })
      );
      const target = (all.Items ?? []).find((r) => r.id === estId);
      if (!target) return notFound('Estimation not found');

      const updateExpr: string[] = [];
      const exprVals: Record<string, unknown> = {};
      const exprNames: Record<string, string> = {};

      const fields: Array<{ key: string; attr: string; alias?: boolean }> = [
        { key: 'status', attr: ':status', alias: true },
        { key: 'invoiceNo', attr: ':invoiceNo' },
        { key: 'paidDate', attr: ':paidDate' },
        { key: 'submittedDate', attr: ':submittedDate' },
        { key: 'deductions', attr: ':deductions' },
        { key: 'liquid', attr: ':liquid' },
        { key: 'amount', attr: ':amount' },
        { key: 'amountWithIVA', attr: ':amountWithIVA' },
      ];

      for (const { key, attr, alias } of fields) {
        if (body[key] !== undefined) {
          const nameRef = alias ? `#${key}` : key;
          if (alias) exprNames[`#${key}`] = key;
          updateExpr.push(`${nameRef} = ${attr}`);
          exprVals[attr] = body[key];
        }
      }
      if (!updateExpr.length) return badRequest('Nothing to update');

      await dynamo.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { PK: target.PK as string, SK: target.SK as string },
          UpdateExpression: `SET ${updateExpr.join(', ')}`,
          ExpressionAttributeValues: exprVals,
          ...(Object.keys(exprNames).length
            ? { ExpressionAttributeNames: exprNames }
            : {}),
        })
      );
      return ok({ ...target, ...body });
    }

    return badRequest('Unknown route');
  } catch (err) {
    return serverError(err);
  }
}
