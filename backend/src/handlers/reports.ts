import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  QueryCommand,
  PutCommand,
  UpdateCommand,
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

/**
 * Reports endpoint — heavy lifting moved server-side so the supervisor's
 * form only collects:
 *   - reportDate (Fecha de corte)
 *   - parcial físico ($ this week)
 *   - parcial financiero ($ this week)
 *   - description, observations, photos
 *
 * We compute weekNo, acumulados, %s, and the programado lookup ourselves.
 */
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
    const { frontId, reportId } = event.pathParameters ?? {};
    if (!frontId) return badRequest('frontId required');

    // GET /fronts/:frontId/reports
    if (method === 'GET' && !reportId) {
      const result = await dynamo.send(
        new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: {
            ':pk': `FRONT#${frontId}`,
            ':prefix': 'REPORT#',
          },
          ScanIndexForward: true,
        })
      );
      return ok(result.Items ?? []);
    }

    // GET /fronts/:frontId/reports/:reportId
    if (method === 'GET' && reportId) {
      const all = await dynamo.send(
        new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: {
            ':pk': `FRONT#${frontId}`,
            ':prefix': 'REPORT#',
          },
        })
      );
      const found = (all.Items ?? []).find((r) => r.id === reportId);
      if (!found) return notFound('Report not found');
      return ok(found);
    }

    // POST /fronts/:frontId/reports — simplified
    if (method === 'POST') {
      if (user.role === 'billing') return unauthorized();
      const body = JSON.parse(event.body ?? '{}');
      const {
        reportDate,
        parcialFisico,
        parcialFinanciero,
        description,
        observations,
        photos,
      } = body;
      if (!reportDate) return badRequest('reportDate required');

      // 1. Find matching schedule row for this fecha de corte
      const schedResp = await dynamo.send(
        new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: {
            ':pk': `FRONT#${frontId}`,
            ':prefix': 'SCHED#',
          },
        })
      );
      const schedule = schedResp.Items ?? [];
      const schedRow =
        schedule.find((r) => r.fechaCorte === reportDate) ??
        nearestScheduleRow(schedule, reportDate);
      const weekNo = Number(schedRow?.weekNo ?? 0);
      const progParcialScheduled = Number(schedRow?.progParcial ?? 0);
      const progAcumScheduled = Number(schedRow?.progAcumulado ?? 0);
      const progPctScheduled = Number(schedRow?.progAcumuladoPct ?? 0);

      // 2. Load previous reports to get accumulated values
      const reportsResp = await dynamo.send(
        new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: {
            ':pk': `FRONT#${frontId}`,
            ':prefix': 'REPORT#',
          },
        })
      );
      const previous = (reportsResp.Items ?? [])
        .filter((r) => Number(r.weekNo) < weekNo)
        .sort((a, b) => Number(b.weekNo) - Number(a.weekNo))[0];
      const prevFisicoAcum = Number(previous?.avanceFisicoRealAcum ?? 0);
      const prevFinancieroAcum = Number(previous?.avanceFinancieroRealAcum ?? 0);

      // 3. Find total contract amount (front amount → fall back to project)
      const totalAmount = await getFrontTotalAmount(frontId);

      const parcF = Number(parcialFisico ?? 0);
      const parcN = Number(parcialFinanciero ?? 0);
      const acumF = Number((prevFisicoAcum + parcF).toFixed(2));
      const acumN = Number((prevFinancieroAcum + parcN).toFixed(2));
      const pctF = totalAmount > 0 ? Number(((acumF / totalAmount) * 100).toFixed(4)) : 0;
      const pctN = totalAmount > 0 ? Number(((acumN / totalAmount) * 100).toFixed(4)) : 0;

      const id = crypto.randomUUID();
      const item = {
        PK: `FRONT#${frontId}`,
        SK: `REPORT#${reportDate}`,
        GSI1PK: 'REPORT',
        id,
        frontId,
        weekNo,
        reportDate,
        // Programado (looked up from schedule)
        progParcialScheduled,
        progAcumScheduled,
        progPctScheduled,
        // Real (auto-computed from previous + this week's parcial)
        avanceFisicoReal: parcF,
        avanceFisicoRealAcum: acumF,
        avanceFisicoPct: pctF,
        avanceFinancieroReal: parcN,
        avanceFinancieroRealAcum: acumN,
        avanceFinancieroPct: pctN,
        description: description ?? '',
        observations: observations ?? '',
        photos: Array.isArray(photos) ? photos : [],
        submittedBy: user.userId,
        submittedByName: user.name,
        submittedAt: new Date().toISOString(),
      };
      await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
      return created(item);
    }

    // PUT /fronts/:frontId/reports/:reportId — partial edit
    if (method === 'PUT' && reportId) {
      if (user.role === 'billing') return unauthorized();
      const body = JSON.parse(event.body ?? '{}');
      if (!body.reportDate) return badRequest('reportDate required');

      const updateExpr: string[] = [];
      const exprVals: Record<string, unknown> = {};
      const exprNames: Record<string, string> = {};

      // Editable text fields
      ['description', 'observations'].forEach((k) => {
        if (body[k] !== undefined) {
          updateExpr.push(`${k} = :${k}`);
          exprVals[`:${k}`] = body[k];
        }
      });
      if (Array.isArray(body.photos)) {
        updateExpr.push('photos = :photos');
        exprVals[':photos'] = body.photos;
      }
      if (body.parcialFisico !== undefined || body.parcialFinanciero !== undefined) {
        // Recompute acumulados — pull previous report and totals
        const totalAmount = await getFrontTotalAmount(frontId);
        const reportsResp = await dynamo.send(
          new QueryCommand({
            TableName: TABLE,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
            ExpressionAttributeValues: {
              ':pk': `FRONT#${frontId}`,
              ':prefix': 'REPORT#',
            },
          })
        );
        const current = (reportsResp.Items ?? []).find((r) => r.id === reportId);
        if (!current) return notFound('Report not found');
        const previous = (reportsResp.Items ?? [])
          .filter((r) => Number(r.weekNo) < Number(current.weekNo))
          .sort((a, b) => Number(b.weekNo) - Number(a.weekNo))[0];
        const parcF = Number(body.parcialFisico ?? current.avanceFisicoReal ?? 0);
        const parcN = Number(body.parcialFinanciero ?? current.avanceFinancieroReal ?? 0);
        const acumF = Number((Number(previous?.avanceFisicoRealAcum ?? 0) + parcF).toFixed(2));
        const acumN = Number((Number(previous?.avanceFinancieroRealAcum ?? 0) + parcN).toFixed(2));
        const pctF = totalAmount > 0 ? Number(((acumF / totalAmount) * 100).toFixed(4)) : 0;
        const pctN = totalAmount > 0 ? Number(((acumN / totalAmount) * 100).toFixed(4)) : 0;
        updateExpr.push(
          'avanceFisicoReal = :pf',
          'avanceFisicoRealAcum = :af',
          'avanceFisicoPct = :pctf',
          'avanceFinancieroReal = :pn',
          'avanceFinancieroRealAcum = :an',
          'avanceFinancieroPct = :pctn'
        );
        Object.assign(exprVals, {
          ':pf': parcF,
          ':af': acumF,
          ':pctf': pctF,
          ':pn': parcN,
          ':an': acumN,
          ':pctn': pctN,
        });
      }
      if (!updateExpr.length) return badRequest('Nothing to update');

      await dynamo.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { PK: `FRONT#${frontId}`, SK: `REPORT#${body.reportDate}` },
          UpdateExpression: `SET ${updateExpr.join(', ')}`,
          ExpressionAttributeValues: exprVals,
          ...(Object.keys(exprNames).length
            ? { ExpressionAttributeNames: exprNames }
            : {}),
        })
      );
      return ok({ id: reportId, ...body });
    }

    return badRequest('Unknown route');
  } catch (err) {
    return serverError(err);
  }
}

async function getFrontTotalAmount(frontId: string): Promise<number> {
  // Scan GSI1 for the front, then pull the project meta if needed.
  const frontScan = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :t',
      ExpressionAttributeValues: { ':t': 'FRONT' },
    })
  );
  const front = (frontScan.Items ?? []).find((f) => f.id === frontId);
  if (!front) return 0;
  if (Number(front.amount ?? 0) > 0) return Number(front.amount);
  const proj = await dynamo.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: `PROJECT#${front.projectId}`, SK: '#META' },
    })
  );
  return Number(proj.Item?.amountWithIVA ?? 0);
}

function nearestScheduleRow(
  schedule: Record<string, unknown>[],
  date: string
): Record<string, unknown> | undefined {
  // Pick the row whose fechaCorte is closest to (and not after) the report date
  const candidates = schedule
    .filter((r) => String(r.fechaCorte ?? '') <= date)
    .sort((a, b) => String(b.fechaCorte).localeCompare(String(a.fechaCorte)));
  return candidates[0] ?? schedule[0];
}
