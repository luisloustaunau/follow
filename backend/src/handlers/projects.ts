import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  QueryCommand,
  PutCommand,
  GetCommand,
  UpdateCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { dynamo, TABLE } from '../lib/dynamo.js';
import { extractToken } from '../lib/jwt.js';
import {
  ok,
  created,
  unauthorized,
  notFound,
  serverError,
  badRequest,
} from '../lib/response.js';
import { generateMonthProgram } from '../lib/schedule.js';

/** IVA rate applied to contract amounts (16% in Mexico). */
const IVA_RATE = 1.16;

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
      const projects = result.Items ?? [];

      // For each project, find its fronts, then pull the latest report to get avanceFisico.
      // The % is recomputed here from the accumulated amount so that records written
      // before the sin-IVA fix still display correctly.
      const enriched = await Promise.all(
        projects.map(async (p) => {
          try {
            const frontsRes = await dynamo.send(new QueryCommand({
              TableName: TABLE,
              KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
              ExpressionAttributeValues: { ':pk': `PROJECT#${p.id}`, ':prefix': 'FRONT#' },
            }));
            const fronts = frontsRes.Items ?? [];

            // Executed work is measured sin IVA, so the contract must be too.
            const amountWithIVA = Number(p.amountWithIVA ?? 0);
            const projectSinIVA = amountWithIVA > 0 ? amountWithIVA / IVA_RATE : 0;

            let acumTotal = 0;
            let frontsBase = 0;
            let fallbackPct = 0;

            for (const front of fronts) {
              const reportsRes = await dynamo.send(new QueryCommand({
                TableName: TABLE,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
                ExpressionAttributeValues: { ':pk': `FRONT#${front.id}`, ':prefix': 'REPORT#' },
                ScanIndexForward: false,
                Limit: 1,
              }));
              const latest = reportsRes.Items?.[0];
              if (!latest) continue;
              acumTotal += Number(latest.avanceFisicoRealAcum ?? 0);
              // Front amounts are stored con IVA, same as the project.
              frontsBase += Number(front.amount ?? 0) / IVA_RATE;
              fallbackPct = Math.max(fallbackPct, Number(latest.avanceFisicoPct ?? 0));
            }

            // Prefer the sum of front amounts; fall back to the project total.
            // Both are already converted to their sin-IVA base.
            const base = frontsBase > 0 ? frontsBase : projectSinIVA;
            const avanceFisico =
              base > 0 ? (acumTotal / base) * 100 : fallbackPct;

            return { ...p, avanceFisico: parseFloat(avanceFisico.toFixed(2)) };
          } catch {
            return { ...p, avanceFisico: 0 };
          }
        })
      );
      return ok(enriched);
    }

    // GET /projects/:id
    if (method === 'GET' && projectId) {
      const result = await dynamo.send(
        new GetCommand({
          TableName: TABLE,
          Key: { PK: `PROJECT#${projectId}`, SK: '#META' },
        })
      );
      if (!result.Item) return notFound('Project not found');
      return ok(result.Item);
    }

    // POST /projects (owner only)
    if (method === 'POST') {
      if (user.role !== 'owner') return unauthorized();
      const body = JSON.parse(event.body ?? '{}');
      const {
        name,
        contractNo,
        contractor,
        amountWithIVA,
        startDate,
        endDate,
        durationDays,
        advance,
        coordinator,
        service,
      } = body;
      if (!name || !contractNo) return badRequest('name and contractNo required');

      const id = crypto.randomUUID();
      const amount = Number(amountWithIVA);
      const item = {
        PK: `PROJECT#${id}`,
        SK: '#META',
        GSI1PK: 'PROJECT',
        id,
        name,
        contractNo,
        contractor,
        amountWithIVA: amount,
        startDate,
        endDate,
        durationDays: Number(durationDays),
        advance: advance ? Number(advance) : 0,
        coordinator: coordinator ?? '',
        service: service ?? '',
        status: body.status ?? 'EN_PROGRESO',
        createdAt: new Date().toISOString(),
      };
      await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));

      // Auto-seed monthly program (the IMPORTES PROGRAMADOS row)
      const rows = generateMonthProgram(startDate, endDate, amount);
      for (let i = 0; i < rows.length; i += 25) {
        const chunk = rows.slice(i, i + 25);
        await dynamo.send(
          new BatchWriteCommand({
            RequestItems: {
              [TABLE]: chunk.map((r) => ({
                PutRequest: {
                  Item: {
                    PK: `PROJECT#${id}`,
                    SK: `MONTHPROG#${r.month}`,
                    projectId: id,
                    ...r,
                  },
                },
              })),
            },
          })
        );
      }

      return created({ ...item, monthlyProgramRows: rows.length });
    }

    // PUT /projects/:id — update status (owner only)
    if (method === 'PUT' && projectId) {
      if (user.role !== 'owner') return unauthorized();
      const body = JSON.parse(event.body ?? '{}');
      const allowed = ['PLANEACION', 'EN_PROGRESO', 'PAUSADO', 'COMPLETADO'];
      if (!body.status || !allowed.includes(body.status))
        return badRequest(`status must be one of: ${allowed.join(', ')}`);
      await dynamo.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `PROJECT#${projectId}`, SK: '#META' },
        UpdateExpression: 'SET #s = :s',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':s': body.status },
      }));
      return ok({ id: projectId, status: body.status });
    }

    return badRequest('Unknown route');
  } catch (err) {
    return serverError(err);
  }
}
