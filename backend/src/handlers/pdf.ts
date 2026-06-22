import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import PDFDocument from 'pdfkit';
import { dynamo, TABLE } from '../lib/dynamo.js';
import { s3, BUCKET } from '../lib/s3.js';
import { extractToken } from '../lib/jwt.js';
import {
  ok,
  unauthorized,
  serverError,
  badRequest,
  notFound,
} from '../lib/response.js';

const ANMA_RED = '#8B0000';
const ANMA_DARK = '#1F2937';
const ANMA_LIGHT = '#F3F4F6';

function fmtMXN(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  })
    .format(n)
    .replace('$', '$');
}

function fmtPct(n: number): string {
  return `${(n ?? 0).toFixed(4)}%`;
}

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
    const { frontId, reportId, projectId } = event.pathParameters ?? {};

    // ── /fronts/:frontId/reports/:reportId/pdf ─────────────────────
    if (path.includes('/reports/') && path.endsWith('/pdf')) {
      if (!frontId || !reportId) return badRequest('frontId+reportId required');
      const url = await generateWeeklyReportPDF(frontId, reportId);
      return ok({ url });
    }

    // ── /projects/:projectId/estimations/pdf ───────────────────────
    if (path.includes('/estimations/pdf')) {
      if (!projectId) return badRequest('projectId required');
      const url = await generateEstimationsPDF(projectId);
      return ok({ url });
    }

    return badRequest('Unknown PDF route');
  } catch (err) {
    return serverError(err);
  }
}

// ─────────────────────────────────────────────────────────────────
// Weekly report PDF — matches Regina's Excel template exactly
// ─────────────────────────────────────────────────────────────────
async function generateWeeklyReportPDF(
  frontId: string,
  reportId: string
): Promise<string> {
  // 1. Fetch report by scanning the front's reports (reportId is uuid not key)
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
  const report = (reportsResp.Items ?? []).find((r) => r.id === reportId);
  if (!report) throw new Error('Report not found');

  // 2. Find the front + project for header info
  const frontScan = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :t',
      ExpressionAttributeValues: { ':t': 'FRONT' },
    })
  );
  const front = (frontScan.Items ?? []).find((f) => f.id === frontId);
  if (!front) throw new Error('Front not found');
  const project = await dynamo.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: `PROJECT#${front.projectId}`, SK: '#META' },
    })
  );
  if (!project.Item) throw new Error('Project not found');

  // 3. Schedule + sibling reports for the chart
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
  const reports = reportsResp.Items ?? [];

  // 4. Generate the PDF in memory
  const buffer = await renderWeeklyPDF({
    project: project.Item,
    front,
    report,
    schedule,
    reports,
  });

  // 5. Upload + return presigned URL
  const key = `pdfs/reports/${reportId}-${Date.now()}.pdf`;
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
    })
  );
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 60 * 60 * 24 * 7 }
  );
}

interface WeeklyPDFInput {
  project: Record<string, unknown>;
  front: Record<string, unknown>;
  report: Record<string, unknown>;
  schedule: Record<string, unknown>[];
  reports: Record<string, unknown>[];
}

function renderWeeklyPDF(input: WeeklyPDFInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      layout: 'landscape',
      margin: 24,
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const { project, front, report, schedule, reports } = input;
    const W = doc.page.width;
    const H = doc.page.height;
    const margin = 24;
    const innerW = W - margin * 2;
    let y = margin;

    // ── Top header row: ANMA logo | title | reporte info ─────────
    const headerH = 50;
    // logo box
    doc.rect(margin, y, 100, headerH).strokeColor('#000').lineWidth(1).stroke();
    doc.rect(margin + 4, y + 6, 92, headerH - 12).fill(ANMA_RED);
    doc
      .fillColor('white')
      .font('Helvetica-Bold')
      .fontSize(14)
      .text('ANMA', margin + 4, y + 12, { width: 92, align: 'center' });
    doc.fontSize(8).text('INGENIERIA', margin + 4, y + 30, {
      width: 92,
      align: 'center',
    });

    // central title
    doc
      .fillColor('#000')
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('REPORTE SEMANAL INTERNO', margin + 110, y + 6, {
        width: innerW - 110 - 180,
        align: 'center',
      });
    doc.fontSize(10).text(
      `FRENTE (${(front.name as string) ?? 'XXX'})`,
      margin + 110,
      y + 22,
      { width: innerW - 110 - 180, align: 'center' }
    );
    doc
      .fontSize(9)
      .font('Helvetica')
      .text(
        'CAMINOS Y PUENTES FEDERALES DE INGRESOS Y SERVICIOS CONEXOS',
        margin + 110,
        y + 36,
        { width: innerW - 110 - 180, align: 'center' }
      );

    // right info box
    const rx = margin + innerW - 180;
    doc.rect(rx, y, 180, headerH).strokeColor('#000').stroke();
    drawKV(doc, 'REPORTE NO.', String(report.weekNo ?? '').padStart(3, '0'), rx, y, 180, 16);
    drawKV(doc, 'FECHA', String(report.reportDate ?? ''), rx, y + 16, 180, 16);
    drawKV(doc, 'PÁGINA', '1 DE 1', rx, y + 32, 180, 18);

    y += headerH + 4;

    // ── DATOS CONTRATO ANMA ──────────────────────────────────────
    sectionBar(doc, 'DATOS CONTRATO ANMA', margin, y, innerW);
    y += 16;
    const labelW = 100;
    rowLine(doc, 'SERVICIO:', '', margin, y, innerW, labelW);
    y += 16;
    rowLine(doc, 'CONTRATO:', String(project.contractNo ?? ''), margin, y, innerW, labelW);
    y += 16;
    rowLine(doc, 'COORDINADOR:', String(project.coordinator ?? ''), margin, y, innerW, labelW);
    y += 18;

    // ── DATOS GENERALES DE LA OBRA ───────────────────────────────
    sectionBar(doc, 'DATOS GENERALES DE LA OBRA', margin, y, innerW);
    y += 16;

    // OBRA row
    rowSplit(
      doc,
      [
        { label: 'OBRA', value: String(project.name ?? ''), w: innerW * 0.55 },
        {
          label: 'PROGRAMA DE OBRA',
          value: '',
          w: innerW * 0.45,
          isHeader: true,
        },
      ],
      margin,
      y,
      28
    );
    // Programa de obra right side: INICIO / TERMINO
    doc
      .fontSize(7)
      .fillColor('#000')
      .font('Helvetica-Bold')
      .text('INICIO', margin + innerW * 0.55 + 4, y + 14, { width: innerW * 0.22 });
    doc.font('Helvetica').text(
      String(project.startDate ?? ''),
      margin + innerW * 0.55 + 4,
      y + 22,
      { width: innerW * 0.22 }
    );
    doc.font('Helvetica-Bold').text('TÉRMINO', margin + innerW * 0.77 + 4, y + 14, {
      width: innerW * 0.22,
    });
    doc.font('Helvetica').text(
      String(project.endDate ?? ''),
      margin + innerW * 0.77 + 4,
      y + 22,
      { width: innerW * 0.22 }
    );
    y += 28;

    // CONTRATISTA + IMPORTE + DURACIÓN row
    const c1 = innerW * 0.35;
    const c2 = innerW * 0.25;
    const c3 = innerW * 0.2;
    const c4 = innerW * 0.2;
    boxCell(doc, 'CONTRATISTA:', String(project.contractor ?? ''), margin, y, c1, 28);
    boxCell(
      doc,
      'IMPORTE CON I.V.A.',
      fmtMXN(Number(project.amountWithIVA ?? 0)),
      margin + c1,
      y,
      c2,
      28
    );
    boxCell(doc, 'ANTICIPO', Number(project.advance ?? 0) > 0 ? fmtMXN(Number(project.advance)) : '—', margin + c1 + c2, y, c3, 28);
    boxCell(
      doc,
      'Duración:',
      `${project.durationDays ?? '?'} días naturales`,
      margin + c1 + c2 + c3,
      y,
      c4,
      28
    );
    y += 28;

    // CONTRATO no. row
    boxCell(
      doc,
      'CONTRATO:',
      String(project.contractNo ?? ''),
      margin,
      y,
      c1,
      24
    );
    boxCell(doc, '', '', margin + c1, y, c2 + c3 + c4, 24);
    y += 24;

    // ── AVANCES ──────────────────────────────────────────────────
    const advanceH = 50;
    const aw = innerW / 4;
    boxCell(doc, 'AVANCES:', '', margin, y, aw, advanceH, true);
    avanceCell(
      doc,
      'PROGRAMADO',
      fmtMXN(Number(report.progParcialScheduled ?? 0)),
      fmtPct(Number(report.progPctScheduled ?? 0)),
      margin + aw,
      y,
      aw,
      advanceH
    );
    avanceCell(
      doc,
      'FÍSICO',
      fmtMXN(Number(report.avanceFisicoRealAcum ?? 0)),
      fmtPct(Number(report.avanceFisicoPct ?? 0)),
      margin + aw * 2,
      y,
      aw,
      advanceH
    );
    avanceCell(
      doc,
      'FINANCIERO',
      fmtMXN(Number(report.avanceFinancieroRealAcum ?? 0)),
      fmtPct(Number(report.avanceFinancieroPct ?? 0)),
      margin + aw * 3,
      y,
      aw,
      advanceH
    );
    y += advanceH;

    // ── GRÁFICA ──────────────────────────────────────────────────
    sectionBar(doc, 'GRÁFICA DE AVANCE PROGRAMADO VS AVANCE REAL', margin, y, innerW);
    y += 16;
    const chartH = 180;
    drawChart(doc, margin, y, innerW, chartH, schedule, reports);
    y += chartH + 4;

    // ── DESCRIPCIÓN + REPORTE FOTOGRÁFICO ───────────────────────
    const halfW = innerW / 2;
    sectionBar(doc, 'DESCRIPCIÓN DE TRABAJOS', margin, y, halfW);
    sectionBar(doc, 'REPORTE FOTOGRÁFICO', margin + halfW, y, halfW);
    y += 16;
    const remainH = H - margin - y;
    doc.rect(margin, y, halfW, remainH).strokeColor('#000').stroke();
    doc.rect(margin + halfW, y, halfW, remainH).strokeColor('#000').stroke();

    doc
      .fillColor('#000')
      .font('Helvetica')
      .fontSize(9)
      .text(String(report.description ?? ''), margin + 6, y + 6, {
        width: halfW - 12,
        height: remainH - 12,
      });

    const obs = String(report.observations ?? '');
    if (obs) {
      doc.font('Helvetica-Oblique').fontSize(8).fillColor('#444');
      doc.text(`\nObservaciones: ${obs}`, margin + 6, doc.y, {
        width: halfW - 12,
      });
    }

    // Photos: just show count + filenames (embedding S3 images would need
    // an extra download step; we keep v1 simple and reliable.)
    const photos = (report.photos as string[]) ?? [];
    doc
      .fillColor('#000')
      .font('Helvetica')
      .fontSize(9)
      .text(
        photos.length > 0
          ? `${photos.length} fotografía(s) adjunta(s) — consultar en la plataforma.`
          : 'Sin fotografías.',
        margin + halfW + 6,
        y + 6,
        { width: halfW - 12 }
      );

    doc.end();
  });
}

// ─── helpers ─────────────────────────────────────────────────────
function drawKV(
  doc: PDFKit.PDFDocument,
  k: string,
  v: string,
  x: number,
  y: number,
  w: number,
  h: number
) {
  doc.rect(x, y, w * 0.45, h).fillAndStroke(ANMA_LIGHT, '#000');
  doc
    .fillColor('#000')
    .font('Helvetica-Bold')
    .fontSize(7)
    .text(k, x + 2, y + h / 2 - 3, { width: w * 0.45 - 4, align: 'left' });
  doc.rect(x + w * 0.45, y, w * 0.55, h).strokeColor('#000').stroke();
  doc
    .font('Helvetica')
    .fontSize(8)
    .text(v, x + w * 0.45 + 4, y + h / 2 - 3, {
      width: w * 0.55 - 8,
      align: 'left',
    });
}

function sectionBar(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  w: number
) {
  doc.rect(x, y, w, 14).fillAndStroke(ANMA_RED, '#000');
  doc
    .fillColor('white')
    .font('Helvetica-Bold')
    .fontSize(8)
    .text(text, x, y + 3, { width: w, align: 'center' });
  doc.fillColor('#000');
}

function rowLine(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number,
  labelW: number
) {
  doc.rect(x, y, labelW, 14).fillAndStroke(ANMA_LIGHT, '#000');
  doc
    .fillColor('#000')
    .font('Helvetica-Bold')
    .fontSize(7)
    .text(label, x + 4, y + 3, { width: labelW - 8 });
  doc.rect(x + labelW, y, w - labelW, 14).strokeColor('#000').stroke();
  doc
    .font('Helvetica')
    .fontSize(8)
    .text(value, x + labelW + 4, y + 3, { width: w - labelW - 8 });
}

function rowSplit(
  doc: PDFKit.PDFDocument,
  cells: { label: string; value: string; w: number; isHeader?: boolean }[],
  x: number,
  y: number,
  h: number
) {
  let cx = x;
  for (const c of cells) {
    if (c.isHeader) {
      doc.rect(cx, y, c.w, 14).fillAndStroke(ANMA_RED, '#000');
      doc
        .fillColor('white')
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(c.label, cx, y + 3, { width: c.w, align: 'center' });
      doc.rect(cx, y + 14, c.w, h - 14).strokeColor('#000').stroke();
    } else {
      doc.rect(cx, y, c.w, h).strokeColor('#000').stroke();
      doc
        .fillColor('#000')
        .font('Helvetica-Bold')
        .fontSize(7)
        .text(c.label, cx + 4, y + 3, { width: c.w - 8 });
      doc.font('Helvetica').fontSize(8).text(c.value, cx + 4, y + 14, {
        width: c.w - 8,
      });
    }
    cx += c.w;
  }
}

function boxCell(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number,
  h: number,
  isHeader = false
) {
  if (isHeader) {
    doc.rect(x, y, w, h).fillAndStroke(ANMA_RED, '#000');
    doc
      .fillColor('white')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(label, x, y + h / 2 - 5, { width: w, align: 'center' });
    doc.fillColor('#000');
    return;
  }
  doc.rect(x, y, w, h).strokeColor('#000').stroke();
  doc
    .fillColor('#000')
    .font('Helvetica-Bold')
    .fontSize(7)
    .text(label, x + 4, y + 3, { width: w - 8 });
  doc.font('Helvetica').fontSize(9).text(value, x + 4, y + h / 2, {
    width: w - 8,
  });
}

function avanceCell(
  doc: PDFKit.PDFDocument,
  label: string,
  amount: string,
  pct: string,
  x: number,
  y: number,
  w: number,
  h: number
) {
  doc.rect(x, y, w * 0.45, h).fillAndStroke(ANMA_LIGHT, '#000');
  doc
    .fillColor('#000')
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(label, x, y + h / 2 - 5, { width: w * 0.45, align: 'center' });
  doc.rect(x + w * 0.45, y, w * 0.55, h / 2).strokeColor('#000').stroke();
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(amount, x + w * 0.45, y + 3, { width: w * 0.55, align: 'center' });
  doc.rect(x + w * 0.45, y + h / 2, w * 0.55, h / 2).strokeColor('#000').stroke();
  doc.font('Helvetica').fontSize(9).text(pct, x + w * 0.45, y + h / 2 + 3, {
    width: w * 0.55,
    align: 'center',
  });
}

function drawChart(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  schedule: Record<string, unknown>[],
  reports: Record<string, unknown>[]
) {
  doc.rect(x, y, w, h).strokeColor('#000').stroke();
  if (schedule.length === 0) {
    doc
      .fontSize(9)
      .fillColor('#888')
      .text('Sin programa de obra cargado.', x, y + h / 2 - 6, {
        width: w,
        align: 'center',
      });
    return;
  }

  const padX = 50;
  const padY = 16;
  const chartX = x + padX;
  const chartY = y + padY;
  const chartW = w - padX - 16;
  const chartH = h - padY * 2;

  const maxScheduled = Math.max(
    ...schedule.map((r) => Number(r.progAcumulado ?? 0)),
    1
  );

  // Y axis labels: 0, 25, 50, 75, 100 %
  for (let i = 0; i <= 4; i++) {
    const yy = chartY + chartH - (i / 4) * chartH;
    const val = (maxScheduled * i) / 4;
    doc
      .strokeColor('#E5E7EB')
      .lineWidth(0.5)
      .moveTo(chartX, yy)
      .lineTo(chartX + chartW, yy)
      .stroke();
    doc
      .fillColor('#666')
      .fontSize(6)
      .text(formatShort(val), x + 4, yy - 3, { width: padX - 8, align: 'right' });
  }

  // X axis labels (every ~6 weeks)
  schedule.forEach((row, i) => {
    if (i % 6 !== 0) return;
    const xx = chartX + (i / Math.max(1, schedule.length - 1)) * chartW;
    doc
      .fillColor('#666')
      .fontSize(6)
      .text(String(row.fechaCorte ?? '').slice(5), xx - 12, y + h - 10, {
        width: 24,
        align: 'center',
      });
  });

  // Programado line
  doc.strokeColor('#3B82F6').lineWidth(1.2);
  schedule.forEach((row, i) => {
    const xx = chartX + (i / Math.max(1, schedule.length - 1)) * chartW;
    const yy = chartY + chartH - (Number(row.progAcumulado ?? 0) / maxScheduled) * chartH;
    if (i === 0) doc.moveTo(xx, yy);
    else doc.lineTo(xx, yy);
  });
  doc.stroke();

  // Real line (green dots)
  const reportByWeek = new Map<number, Record<string, unknown>>();
  reports.forEach((r) => reportByWeek.set(Number(r.weekNo ?? -1), r));
  doc.strokeColor('#16A34A').fillColor('#16A34A').lineWidth(1.2);
  let started = false;
  schedule.forEach((row, i) => {
    const rep = reportByWeek.get(Number(row.weekNo ?? -1));
    if (!rep) return;
    const xx = chartX + (i / Math.max(1, schedule.length - 1)) * chartW;
    const yy =
      chartY + chartH - (Number(rep.avanceFinancieroRealAcum ?? 0) / maxScheduled) * chartH;
    if (!started) {
      doc.moveTo(xx, yy);
      started = true;
    } else {
      doc.lineTo(xx, yy);
    }
    doc.circle(xx, yy, 1.6).fill();
  });
  if (started) doc.stroke();

  // Legend
  doc.strokeColor('#3B82F6').lineWidth(2).moveTo(chartX + 8, y + 8).lineTo(chartX + 26, y + 8).stroke();
  doc.fillColor('#000').fontSize(7).text('Programado', chartX + 30, y + 5);
  doc.strokeColor('#16A34A').lineWidth(2).moveTo(chartX + 100, y + 8).lineTo(chartX + 118, y + 8).stroke();
  doc.fillColor('#000').fontSize(7).text('Real', chartX + 122, y + 5);
}

function formatShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toFixed(0);
}

// ─────────────────────────────────────────────────────────────────
// Estimaciones PDF — replicates "CONTROL DE ESTIMACIONES" sheet
// ─────────────────────────────────────────────────────────────────
async function generateEstimationsPDF(projectId: string): Promise<string> {
  const project = await dynamo.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: `PROJECT#${projectId}`, SK: '#META' },
    })
  );
  if (!project.Item) throw new Error('Project not found');

  const all = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `PROJECT#${projectId}` },
    })
  );
  const items = all.Items ?? [];
  const monthly = items.filter((i) => (i.SK as string).startsWith('MONTHPROG#'));
  const estimations = items.filter((i) => (i.SK as string).startsWith('ESTIMATION#'));

  const buffer = await renderEstimationsPDF({
    project: project.Item,
    monthly,
    estimations,
  });
  const key = `pdfs/estimations/${projectId}-${Date.now()}.pdf`;
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
    })
  );
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 60 * 60 * 24 * 7 }
  );
}

interface EstimacionesPDFInput {
  project: Record<string, unknown>;
  monthly: Record<string, unknown>[];
  estimations: Record<string, unknown>[];
}

const STATUS_COLORS: Record<string, string> = {
  PAGADA: '#86EFAC',
  INGRESADA: '#FDBA74',
  EN_REVISION: '#FCD34D',
  POR_INGRESAR: '#E5E7EB',
  APROBADA: '#93C5FD',
};

function renderEstimationsPDF(input: EstimacionesPDFInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      layout: 'landscape',
      margin: 24,
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const { project, monthly, estimations } = input;
    const W = doc.page.width;
    const margin = 24;
    const innerW = W - margin * 2;
    let y = margin;

    // Header
    doc.rect(margin, y, 80, 36).fillAndStroke(ANMA_RED, '#000');
    doc.fillColor('white').font('Helvetica-Bold').fontSize(11).text('ANMA', margin, y + 8, { width: 80, align: 'center' });
    doc.fontSize(7).text('INGENIERIA', margin, y + 22, { width: 80, align: 'center' });
    doc.fillColor('#000').font('Helvetica-Bold').fontSize(14).text('CONTROL DE ESTIMACIONES', margin + 90, y + 12, {
      width: innerW - 90,
      align: 'center',
    });
    y += 44;

    // Legend
    const legends = [
      { label: 'PAGADA', color: STATUS_COLORS.PAGADA },
      { label: 'PENDIENTE DE PAGO', color: STATUS_COLORS.INGRESADA },
      { label: 'EN REVISIÓN', color: STATUS_COLORS.EN_REVISION },
      { label: 'POR INGRESAR', color: STATUS_COLORS.POR_INGRESAR },
    ];
    let lx = margin;
    legends.forEach((l) => {
      doc.rect(lx, y, 110, 14).fillAndStroke(l.color, '#000');
      doc.fillColor('#000').font('Helvetica-Bold').fontSize(7).text(l.label, lx, y + 3, { width: 110, align: 'center' });
      lx += 116;
    });
    y += 22;

    // Project summary row + months grid
    sectionBar(doc, 'DATOS DEL CONTRATO', margin, y, innerW);
    y += 16;
    const labelW = innerW * 0.18;
    boxCell(doc, 'PROYECTO / OBRA', String(project.name ?? ''), margin, y, labelW, 40);
    boxCell(doc, 'INICIO', String(project.startDate ?? ''), margin + labelW, y, innerW * 0.12, 40);
    boxCell(doc, 'FIN', String(project.endDate ?? ''), margin + labelW + innerW * 0.12, y, innerW * 0.12, 40);
    boxCell(doc, 'NO. CONTRATO', String(project.contractNo ?? ''), margin + labelW + innerW * 0.24, y, innerW * 0.18, 40);
    boxCell(
      doc,
      'IMPORTE CONTRATO',
      fmtMXN(Number(project.amountWithIVA ?? 0)),
      margin + labelW + innerW * 0.42,
      y,
      innerW * 0.18,
      40
    );
    boxCell(
      doc,
      'ANTICIPO',
      Number(project.advance ?? 0) > 0 ? fmtMXN(Number(project.advance)) : 'NO HUBO',
      margin + labelW + innerW * 0.60,
      y,
      innerW * 0.22,
      40
    );
    y += 46;

    // Monthly programmed grid
    sectionBar(doc, 'IMPORTES PROGRAMADOS', margin, y, innerW);
    y += 16;
    const sorted = [...monthly].sort((a, b) =>
      String(a.month).localeCompare(String(b.month))
    );
    const colW = Math.max(60, innerW / Math.max(1, sorted.length + 1));
    // header row
    let cx = margin;
    sorted.forEach((m) => {
      doc.rect(cx, y, colW, 16).fillAndStroke(ANMA_LIGHT, '#000');
      doc
        .fillColor('#000')
        .font('Helvetica-Bold')
        .fontSize(7)
        .text(String(m.monthLabel ?? m.month), cx + 2, y + 4, {
          width: colW - 4,
          align: 'center',
        });
      cx += colW;
    });
    doc.rect(cx, y, colW, 16).fillAndStroke(ANMA_LIGHT, '#000');
    doc
      .fillColor('#000')
      .font('Helvetica-Bold')
      .fontSize(7)
      .text('TOTAL', cx + 2, y + 4, { width: colW - 4, align: 'center' });
    y += 16;
    // value row
    cx = margin;
    let total = 0;
    sorted.forEach((m) => {
      const amt = Number(m.amount ?? 0);
      total += amt;
      doc.rect(cx, y, colW, 18).strokeColor('#000').stroke();
      doc
        .fillColor('#000')
        .font('Helvetica')
        .fontSize(8)
        .text(fmtMXN(amt), cx + 2, y + 5, { width: colW - 4, align: 'right' });
      cx += colW;
    });
    doc.rect(cx, y, colW, 18).fillAndStroke(ANMA_LIGHT, '#000');
    doc
      .fillColor('#000')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text(fmtMXN(total), cx + 2, y + 5, { width: colW - 4, align: 'right' });
    y += 26;

    // ── Estimaciones table ───────────────────────────────────────
    sectionBar(doc, 'ESTIMACIONES', margin, y, innerW);
    y += 16;
    const cols = [
      { label: 'NO.', w: innerW * 0.06 },
      { label: 'PERÍODO', w: innerW * 0.12 },
      { label: 'IMPORTE', w: innerW * 0.14 },
      { label: 'DEDUC. INSPECCIÓN', w: innerW * 0.14 },
      { label: 'IMPORTE CON IVA', w: innerW * 0.14 },
      { label: 'LÍQUIDO', w: innerW * 0.14 },
      { label: 'NO. FACTURA', w: innerW * 0.12 },
      { label: 'STATUS', w: innerW * 0.14 },
    ];
    cx = margin;
    cols.forEach((c) => {
      doc.rect(cx, y, c.w, 16).fillAndStroke(ANMA_LIGHT, '#000');
      doc
        .fillColor('#000')
        .font('Helvetica-Bold')
        .fontSize(7)
        .text(c.label, cx + 2, y + 4, { width: c.w - 4, align: 'center' });
      cx += c.w;
    });
    y += 16;

    const sortedEst = [...estimations].sort((a, b) =>
      String(a.estimationNo).localeCompare(String(b.estimationNo))
    );
    sortedEst.forEach((est) => {
      cx = margin;
      const status = String(est.status ?? 'POR_INGRESAR');
      const rowVals = [
        String(est.estimationNo ?? ''),
        String(est.period ?? ''),
        fmtMXN(Number(est.amount ?? 0)),
        fmtMXN(Number(est.deductions ?? 0)),
        fmtMXN(Number(est.amountWithIVA ?? 0)),
        fmtMXN(Number(est.liquid ?? 0)),
        String(est.invoiceNo ?? ''),
        status,
      ];
      cols.forEach((c, i) => {
        if (i === cols.length - 1) {
          doc.rect(cx, y, c.w, 16).fillAndStroke(STATUS_COLORS[status] ?? '#fff', '#000');
        } else {
          doc.rect(cx, y, c.w, 16).strokeColor('#000').stroke();
        }
        doc
          .fillColor('#000')
          .font('Helvetica')
          .fontSize(8)
          .text(rowVals[i], cx + 2, y + 4, {
            width: c.w - 4,
            align: i >= 2 && i <= 5 ? 'right' : 'center',
          });
        cx += c.w;
      });
      y += 16;
    });

    doc.end();
  });
}
