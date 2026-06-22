import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo, TABLE } from '../lib/dynamo.js';
import { extractToken } from '../lib/jwt.js';
import { ok, unauthorized, serverError, badRequest } from '../lib/response.js';

/**
 * Aggregate endpoints used by the global navigation pages.
 *
 *   GET /reports       → every weekly report across every frente,
 *                        joined with its project + front names.
 *   GET /estimations   → every estimación across every project,
 *                        joined with its project name + contract no.
 *
 * Auth: any logged-in user. Role-based filtering is done on the
 * frontend (supervisors typically only care about their own frentes).
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

    const path = event.resource ?? event.path;

    if (path.endsWith('/reports')) {
      return ok(await listAllReports());
    }
    if (path.endsWith('/estimations')) {
      return ok(await listAllEstimations());
    }

    return badRequest('Unknown global route');
  } catch (err) {
    return serverError(err);
  }
}

async function listAllReports() {
  // 1. All reports via GSI1
  const reportsResp = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :t',
      ExpressionAttributeValues: { ':t': 'REPORT' },
    })
  );
  const reports = reportsResp.Items ?? [];

  // 2. All fronts (for name + projectId lookup)
  const frontsResp = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :t',
      ExpressionAttributeValues: { ':t': 'FRONT' },
    })
  );
  const fronts = frontsResp.Items ?? [];
  const frontById = new Map(fronts.map((f) => [String(f.id), f]));

  // 3. All projects (for name + contractNo lookup)
  const projectsResp = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :t',
      ExpressionAttributeValues: { ':t': 'PROJECT' },
    })
  );
  const projects = projectsResp.Items ?? [];
  const projectById = new Map(projects.map((p) => [String(p.id), p]));

  // 4. Enrich
  const enriched: Record<string, unknown>[] = reports.map((r) => {
    const front = frontById.get(String(r.frontId));
    const project = front ? projectById.get(String(front.projectId)) : undefined;
    return {
      ...r,
      frontName: front?.name ?? '—',
      projectId: front?.projectId ?? null,
      projectName: project?.name ?? '—',
      projectContractNo: project?.contractNo ?? '',
    };
  });

  // 5. Also return one "latest per frente" summary list so the UI can
  //    quickly show frente status without re-grouping client-side.
  const latestByFront = new Map<string, Record<string, unknown>>();
  for (const r of enriched) {
    const cur = latestByFront.get(String(r.frontId));
    if (!cur || Number(r.weekNo) > Number(cur.weekNo)) {
      latestByFront.set(String(r.frontId), r);
    }
  }

  // Build per-frente status (includes fronts with NO reports)
  const frontStatus = fronts.map((f) => {
    const project = projectById.get(String(f.projectId));
    const latest = latestByFront.get(String(f.id));
    return {
      frontId: f.id,
      frontName: f.name,
      projectId: f.projectId,
      projectName: project?.name ?? '—',
      projectContractNo: project?.contractNo ?? '',
      latestReport: latest ?? null,
      reportCount: enriched.filter((r) => r.frontId === f.id).length,
    };
  });

  return {
    reports: enriched.sort((a, b) =>
      String(b.reportDate).localeCompare(String(a.reportDate))
    ),
    frontStatus,
  };
}

async function listAllEstimations() {
  const estResp = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :t',
      ExpressionAttributeValues: { ':t': 'ESTIMATION' },
    })
  );
  const estimations = estResp.Items ?? [];

  const projectsResp = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :t',
      ExpressionAttributeValues: { ':t': 'PROJECT' },
    })
  );
  const projects = projectsResp.Items ?? [];
  const projectById = new Map(projects.map((p) => [String(p.id), p]));

  const enriched: Record<string, unknown>[] = estimations.map((e) => {
    const project = projectById.get(String(e.projectId));
    return {
      ...e,
      projectName: project?.name ?? '—',
      projectContractNo: project?.contractNo ?? '',
      projectContractor: project?.contractor ?? '',
    };
  });

  return {
    estimations: enriched.sort((a, b) =>
      String(b.periodMonth).localeCompare(String(a.periodMonth))
    ),
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      contractNo: p.contractNo,
      contractor: p.contractor,
      amountWithIVA: p.amountWithIVA,
    })),
  };
}
