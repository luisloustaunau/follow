import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  QueryCommand,
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
import { generateSchedule, ScheduleRow } from '../lib/schedule.js';

/**
 * Schedule = the contract baseline ("Programa de Obra") for one Frente.
 * Stored as one DynamoDB item per week:
 *   PK: FRONT#<frontId>
 *   SK: SCHED#W<003>   ← zero-padded so SK sort matches week order
 */
const pad = (n: number) => String(n).padStart(3, '0');

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
    const { frontId, projectId } = event.pathParameters ?? {};
    if (!frontId) return badRequest('frontId required');

    // ── GET /fronts/:frontId/schedule ──────────────────────────────
    if (method === 'GET') {
      const result = await dynamo.send(
        new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: {
            ':pk': `FRONT#${frontId}`,
            ':prefix': 'SCHED#',
          },
        })
      );
      return ok(result.Items ?? []);
    }

    // ── POST /fronts/:frontId/schedule ─────────────────────────────
    // Body options:
    //   { rows: [...] }            ← explicit list (paste from Excel)
    //   { autoSeed: true, total }  ← regenerate from contract dates
    if (method === 'POST') {
      if (user.role !== 'owner') return unauthorized();
      const body = JSON.parse(event.body ?? '{}');

      let rows: ScheduleRow[] = [];
      if (Array.isArray(body.rows) && body.rows.length > 0) {
        rows = normalizeRows(body.rows);
      } else if (body.autoSeed && projectId) {
        const project = await dynamo.send(
          new GetCommand({
            TableName: TABLE,
            Key: { PK: `PROJECT#${projectId}`, SK: '#META' },
          })
        );
        if (!project.Item) return notFound('Project not found');
        rows = generateSchedule(
          project.Item.startDate,
          project.Item.endDate,
          Number(project.Item.amountWithIVA)
        );
      } else {
        return badRequest('rows[] or autoSeed required');
      }

      // Wipe any existing schedule rows for this frente before writing
      await wipeSchedule(frontId);
      await writeScheduleRows(frontId, rows);
      return created({ count: rows.length, rows });
    }

    return badRequest('Unknown route');
  } catch (err) {
    return serverError(err);
  }
}

function normalizeRows(input: unknown[]): ScheduleRow[] {
  // Accept loose shape (e.g. from CSV/Excel paste) and normalize.
  let acum = 0;
  return input
    .map((raw, i) => {
      const r = raw as Record<string, unknown>;
      const weekNo = Number(r.weekNo ?? r.semana ?? i);
      const fechaCorte = String(r.fechaCorte ?? r.fecha ?? '').slice(0, 10);
      const parcial = Number(r.progParcial ?? r.parcial ?? 0);
      const explicitAcum = r.progAcumulado ?? r.acumulado;
      acum =
        explicitAcum !== undefined && explicitAcum !== ''
          ? Number(explicitAcum)
          : Number((acum + parcial).toFixed(2));
      return {
        weekNo,
        fechaCorte,
        progParcial: parcial,
        progParcialPct: Number(r.progParcialPct ?? 0),
        progAcumulado: acum,
        progAcumuladoPct: Number(r.progAcumuladoPct ?? 0),
      } as ScheduleRow;
    })
    .filter((r) => r.fechaCorte.length === 10);
}

async function wipeSchedule(frontId: string) {
  const existing = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `FRONT#${frontId}`,
        ':prefix': 'SCHED#',
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
}

async function writeScheduleRows(frontId: string, rows: ScheduleRow[]) {
  for (let i = 0; i < rows.length; i += 25) {
    const chunk = rows.slice(i, i + 25);
    await dynamo.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE]: chunk.map((r) => ({
            PutRequest: {
              Item: {
                PK: `FRONT#${frontId}`,
                SK: `SCHED#W${pad(r.weekNo)}`,
                frontId,
                ...r,
              },
            },
          })),
        },
      })
    );
  }
}

// Exported for use by other handlers (e.g. auto-seed on Front creation)
export { writeScheduleRows, wipeSchedule };
