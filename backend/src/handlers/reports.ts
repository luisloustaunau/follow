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

    // POST /fronts/:frontId/reports
    if (method === 'POST') {
      if (user.role === 'billing') return unauthorized();
      const body = JSON.parse(event.body ?? '{}');
      const {
        reportDate, weekNo,
        progParcialScheduled, progAcumScheduled, progPctScheduled,
        avanceFisicoReal, avanceFisicoRealAcum, avanceFisicoPct,
        avanceFinancieroReal, avanceFinancieroRealAcum, avanceFinancieroPct,
        description, observations, photos,
      } = body;

      if (!reportDate || weekNo === undefined) return badRequest('reportDate and weekNo required');

      const id = crypto.randomUUID();
      const item = {
        PK: `FRONT#${frontId}`,
        SK: `REPORT#${reportDate}`,
        id,
        frontId,
        weekNo: Number(weekNo),
        reportDate,
        progParcialScheduled: Number(progParcialScheduled ?? 0),
        progAcumScheduled: Number(progAcumScheduled ?? 0),
        progPctScheduled: Number(progPctScheduled ?? 0),
        avanceFisicoReal: Number(avanceFisicoReal ?? 0),
        avanceFisicoRealAcum: Number(avanceFisicoRealAcum ?? 0),
        avanceFisicoPct: Number(avanceFisicoPct ?? 0),
        avanceFinancieroReal: Number(avanceFinancieroReal ?? 0),
        avanceFinancieroRealAcum: Number(avanceFinancieroRealAcum ?? 0),
        avanceFinancieroPct: Number(avanceFinancieroPct ?? 0),
        description: description ?? '',
        observations: observations ?? '',
        photos: photos ?? [],
        submittedBy: user.userId,
        submittedAt: new Date().toISOString(),
      };
      await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
      return created(item);
    }

    // PUT /fronts/:frontId/reports/:reportId
    if (method === 'PUT' && reportId) {
      if (user.role === 'billing') return unauthorized();
      const body = JSON.parse(event.body ?? '{}');

      // Find the item first to get its reportDate (part of SK)
      const existing = await dynamo.send(
        new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND SK = :sk',
          ExpressionAttributeValues: {
            ':pk': `FRONT#${frontId}`,
            ':sk': `REPORT#${body.reportDate}`,
          },
        })
      );
      if (!existing.Items?.length) return badRequest('Report not found');

      await dynamo.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { PK: `FRONT#${frontId}`, SK: `REPORT#${body.reportDate}` },
          UpdateExpression: `SET description = :d, observations = :o, photos = :p,
            avanceFisicoReal = :afr, avanceFisicoRealAcum = :afra, avanceFisicoPct = :afp,
            avanceFinancieroReal = :anfr, avanceFinancieroRealAcum = :anfra, avanceFinancieroPct = :anfp`,
          ExpressionAttributeValues: {
            ':d': body.description ?? '',
            ':o': body.observations ?? '',
            ':p': body.photos ?? [],
            ':afr': Number(body.avanceFisicoReal ?? 0),
            ':afra': Number(body.avanceFisicoRealAcum ?? 0),
            ':afp': Number(body.avanceFisicoPct ?? 0),
            ':anfr': Number(body.avanceFinancieroReal ?? 0),
            ':anfra': Number(body.avanceFinancieroRealAcum ?? 0),
            ':anfp': Number(body.avanceFinancieroPct ?? 0),
          },
        })
      );
      return ok({ ...existing.Items[0], ...body });
    }

    return badRequest('Unknown route');
  } catch (err) {
    return serverError(err);
  }
}
