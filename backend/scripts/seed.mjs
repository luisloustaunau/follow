#!/usr/bin/env node
/**
 * seed.mjs — Wipe all non-user data and insert three realistic projects
 * based on ANMA's actual Excel workbooks.
 *
 * Usage:
 *   node scripts/seed.mjs
 *   AWS_REGION=us-east-1 TABLE_NAME=anma-follow node scripts/seed.mjs
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  BatchWriteCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const REGION = process.env.AWS_REGION ?? 'us-east-1';
const TABLE  = process.env.TABLE_NAME  ?? 'anma-follow';

const raw    = new DynamoDBClient({ region: REGION });
const dynamo = DynamoDBDocumentClient.from(raw, {
  marshallOptions: { removeUndefinedValues: true },
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function batchWrite(items) {
  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25);
    await dynamo.send(new BatchWriteCommand({
      RequestItems: { [TABLE]: chunk },
    }));
  }
}

async function put(item) {
  await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
}

// ─────────────────────────────────────────────────────────────────────────────
// WIPE — delete everything except USER# items
// ─────────────────────────────────────────────────────────────────────────────

async function wipeNonUserData() {
  console.log('🗑  Scanning table for non-USER items...');
  let lastKey;
  const toDelete = [];

  do {
    const resp = await dynamo.send(new ScanCommand({
      TableName: TABLE,
      ProjectionExpression: 'PK, SK',
      ExclusiveStartKey: lastKey,
    }));
    for (const item of resp.Items ?? []) {
      if (!item.PK.startsWith('USER#')) {
        toDelete.push({ DeleteRequest: { Key: { PK: item.PK, SK: item.SK } } });
      }
    }
    lastKey = resp.LastEvaluatedKey;
  } while (lastKey);

  if (toDelete.length === 0) {
    console.log('   Nothing to delete.');
    return;
  }

  console.log(`   Deleting ${toDelete.length} items…`);
  await batchWrite(toDelete);
  console.log('   Done.\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// REAL DATA
// ─────────────────────────────────────────────────────────────────────────────

/*
  PROJECT 1 — Mantenimiento Menor Autopista Querétaro–Irapuato
  Source: Reporte Semanal / Hoja Programa Excel
  Contract con IVA: $18,013,518.78
  Start: 2026-02-23   End: 2027-01-31   343 días naturales

  Weekly Programa de Obra (from Excel Hoja1 — actual approved amounts):
  Semana 0: 2026-02-23   $0            (contract start)
  Semana 1: 2026-03-02   $1,466,285.02
  Semana 2: 2026-03-09   $331,463.28
  Semana 3: 2026-03-16   $331,463.28
  Semana 4: 2026-03-23   $331,463.28
  Semana 5: 2026-03-30   $331,463.28
  Semana 6: 2026-04-06   $340,933.66
  Semana 7: 2026-04-13   $342,512.05
  Semana 8: 2026-04-20   $342,512.05
  Semana 9: 2026-04-27   $342,512.05
  Semana 10: 2026-05-04  $187,224.87
  Semana 11: 2026-05-11  $70,759.49
  Semana 12: 2026-05-18  $70,759.49
  Semana 13: 2026-05-25  $70,759.49
  Semana 14: 2026-06-01  $69,322.59
  Semana 15: 2026-06-08  $60,701.23
  Semana 16: 2026-06-15  $60,701.23
  Semana 17: 2026-06-22  $60,701.23
  Semana 18: 2026-06-29  $60,701.23
  Semana 19: 2026-07-06  $161,686.36
  Semana 20: 2026-07-13  $178,517.22
  Semana 21: 2026-07-20  $178,517.22
  Semana 22: 2026-07-27  $178,517.22
  Semana 23: 2026-08-03  $281,102.60
  Semana 24: 2026-08-10  $417,883.11
  Semana 25: 2026-08-17  $417,883.11
  Semana 26: 2026-08-24  $417,883.11
  Semana 27: 2026-08-31  $417,883.11
  Semana 28: 2026-09-07  $431,812.54
  Semana 29: 2026-09-14  $431,812.54
  Semana 30: 2026-09-21  $431,812.54
  Semana 31: 2026-09-28  $431,812.54
  Semana 32: 2026-10-05  $437,881.02
  Semana 33: 2026-10-12  $440,308.41
  Semana 34: 2026-10-19  $440,308.41
  Semana 35: 2026-10-26  $440,308.41
  Semana 36: 2026-11-02  $441,003.99
  Semana 37: 2026-11-09  $442,742.94
  Semana 38: 2026-11-16  $442,742.94
  Semana 39: 2026-11-23  $442,742.94
  Semana 40: 2026-11-30  $442,742.94
  Semana 41: 2026-12-07  $428,460.91
  Semana 42: 2026-12-14  $428,460.91
  Semana 43: 2026-12-21  $428,460.91
  Semana 44: 2026-12-28  $428,460.91
  Semana 45: 2027-01-04  $557,291.26
  Semana 46: 2027-01-11  $553,914.04
  Semana 47: 2027-01-18  $553,914.04
  Semana 48: 2027-01-25  $653,914.04
  Semana 49: 2027-01-31  $560,487.74  (end date)
*/

const SCHEDULE_P1 = [
  { weekNo: 0,  fechaCorte: '2026-02-23', progParcial: 0 },
  { weekNo: 1,  fechaCorte: '2026-03-02', progParcial: 1466285.02 },
  { weekNo: 2,  fechaCorte: '2026-03-09', progParcial: 331463.28 },
  { weekNo: 3,  fechaCorte: '2026-03-16', progParcial: 331463.28 },
  { weekNo: 4,  fechaCorte: '2026-03-23', progParcial: 331463.28 },
  { weekNo: 5,  fechaCorte: '2026-03-30', progParcial: 331463.28 },
  { weekNo: 6,  fechaCorte: '2026-04-06', progParcial: 340933.66 },
  { weekNo: 7,  fechaCorte: '2026-04-13', progParcial: 342512.05 },
  { weekNo: 8,  fechaCorte: '2026-04-20', progParcial: 342512.05 },
  { weekNo: 9,  fechaCorte: '2026-04-27', progParcial: 342512.05 },
  { weekNo: 10, fechaCorte: '2026-05-04', progParcial: 187224.87 },
  { weekNo: 11, fechaCorte: '2026-05-11', progParcial: 70759.49 },
  { weekNo: 12, fechaCorte: '2026-05-18', progParcial: 70759.49 },
  { weekNo: 13, fechaCorte: '2026-05-25', progParcial: 70759.49 },
  { weekNo: 14, fechaCorte: '2026-06-01', progParcial: 69322.59 },
  { weekNo: 15, fechaCorte: '2026-06-08', progParcial: 60701.23 },
  { weekNo: 16, fechaCorte: '2026-06-15', progParcial: 60701.23 },
  { weekNo: 17, fechaCorte: '2026-06-22', progParcial: 60701.23 },
  { weekNo: 18, fechaCorte: '2026-06-29', progParcial: 60701.23 },
  { weekNo: 19, fechaCorte: '2026-07-06', progParcial: 161686.36 },
  { weekNo: 20, fechaCorte: '2026-07-13', progParcial: 178517.22 },
  { weekNo: 21, fechaCorte: '2026-07-20', progParcial: 178517.22 },
  { weekNo: 22, fechaCorte: '2026-07-27', progParcial: 178517.22 },
  { weekNo: 23, fechaCorte: '2026-08-03', progParcial: 281102.60 },
  { weekNo: 24, fechaCorte: '2026-08-10', progParcial: 417883.11 },
  { weekNo: 25, fechaCorte: '2026-08-17', progParcial: 417883.11 },
  { weekNo: 26, fechaCorte: '2026-08-24', progParcial: 417883.11 },
  { weekNo: 27, fechaCorte: '2026-08-31', progParcial: 417883.11 },
  { weekNo: 28, fechaCorte: '2026-09-07', progParcial: 431812.54 },
  { weekNo: 29, fechaCorte: '2026-09-14', progParcial: 431812.54 },
  { weekNo: 30, fechaCorte: '2026-09-21', progParcial: 431812.54 },
  { weekNo: 31, fechaCorte: '2026-09-28', progParcial: 431812.54 },
  { weekNo: 32, fechaCorte: '2026-10-05', progParcial: 437881.02 },
  { weekNo: 33, fechaCorte: '2026-10-12', progParcial: 440308.41 },
  { weekNo: 34, fechaCorte: '2026-10-19', progParcial: 440308.41 },
  { weekNo: 35, fechaCorte: '2026-10-26', progParcial: 440308.41 },
  { weekNo: 36, fechaCorte: '2026-11-02', progParcial: 441003.99 },
  { weekNo: 37, fechaCorte: '2026-11-09', progParcial: 442742.94 },
  { weekNo: 38, fechaCorte: '2026-11-16', progParcial: 442742.94 },
  { weekNo: 39, fechaCorte: '2026-11-23', progParcial: 442742.94 },
  { weekNo: 40, fechaCorte: '2026-11-30', progParcial: 442742.94 },
  { weekNo: 41, fechaCorte: '2026-12-07', progParcial: 428460.91 },
  { weekNo: 42, fechaCorte: '2026-12-14', progParcial: 428460.91 },
  { weekNo: 43, fechaCorte: '2026-12-21', progParcial: 428460.91 },
  { weekNo: 44, fechaCorte: '2026-12-28', progParcial: 428460.91 },
  { weekNo: 45, fechaCorte: '2027-01-04', progParcial: 557291.26 },
  { weekNo: 46, fechaCorte: '2027-01-11', progParcial: 553914.04 },
  { weekNo: 47, fechaCorte: '2027-01-18', progParcial: 553914.04 },
  { weekNo: 48, fechaCorte: '2027-01-25', progParcial: 653914.04 },
  { weekNo: 49, fechaCorte: '2027-01-31', progParcial: 560487.74 },
];

/*
  PROJECT 2 — Supervisión y Verificación de Calidad de la Obra
  Source: Control de Estimaciones Excel
  Contract SIN IVA: $3,325,588.75  → con IVA: $3,857,682.55
  Start: 2026-06-04   End: 2027-01-14
  Contract No: 450003757I
  Monthly program (IMPORTES PROGRAMADOS sin IVA from Excel):
    JUNIO 2026:      $417,612.12
    JULIO 2026:      $466,807.63
    AGOSTO 2026:     $466,807.63
    SEPTIEMBRE 2026: $466,807.63
    OCTUBRE 2026:    $466,807.63
    NOVIEMBRE 2026:  $466,807.63
    DICIEMBRE 2026:  $466,807.63
    ENERO 2027:      $107,130.82
*/

const MONTH_PROGRAM_P2 = [
  { month: '2026-06', monthLabel: 'JUNIO 2026',      amount: 417612.12 },
  { month: '2026-07', monthLabel: 'JULIO 2026',      amount: 466807.63 },
  { month: '2026-08', monthLabel: 'AGOSTO 2026',     amount: 466807.63 },
  { month: '2026-09', monthLabel: 'SEPTIEMBRE 2026', amount: 466807.63 },
  { month: '2026-10', monthLabel: 'OCTUBRE 2026',    amount: 466807.63 },
  { month: '2026-11', monthLabel: 'NOVIEMBRE 2026',  amount: 466807.63 },
  { month: '2026-12', monthLabel: 'DICIEMBRE 2026',  amount: 466807.63 },
  { month: '2027-01', monthLabel: 'ENERO 2027',      amount: 107130.82 },
];

/*
  PROJECT 3 — Inspección y Diagnóstico Estructural: Puentes Tramo Irapuato
  Fictional but realistic ANMA project.
  Contract con IVA: $2,784,200.00
  Start: 2026-04-01   End: 2026-10-31   213 días naturales
  Contract No: CAPUFE-SUP-003-2026
  Monthly program (sin IVA base = $2,400,172.41):
    ABRIL 2026:      $180,000.00
    MAYO 2026:       $320,000.00
    JUNIO 2026:      $380,000.00
    JULIO 2026:      $420,000.00
    AGOSTO 2026:     $490,000.00
    SEPTIEMBRE 2026: $380,172.41
    OCTUBRE 2026:    $230,000.00
*/

// ─────────────────────────────────────────────────────────────────────────────
// BUILD SCHEDULE — recompute acumulado and pcts from partial amounts
// ─────────────────────────────────────────────────────────────────────────────

function buildSchedule(rows, totalAmount) {
  let acum = 0;
  return rows.map((r) => {
    acum = parseFloat((acum + r.progParcial).toFixed(2));
    return {
      ...r,
      progParcialPct:   parseFloat(((r.progParcial / totalAmount) * 100).toFixed(4)),
      progAcumulado:    acum,
      progAcumuladoPct: parseFloat(((acum / totalAmount) * 100).toFixed(4)),
    };
  });
}

// Simple weekly skeleton for project 3 (uniform-ish)
function buildSimpleSchedule(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end   = new Date(`${endDate}T00:00:00Z`);
  const rows  = [{ weekNo: 0, fechaCorte: startDate, progParcial: 0 }];
  let cur     = new Date(start);
  // advance to next Monday
  const dow   = cur.getUTCDay();
  cur.setUTCDate(cur.getUTCDate() + (dow === 1 ? 7 : (8 - dow) % 7));
  let wn = 1;
  while (cur <= end) {
    const ymd = cur.toISOString().slice(0, 10);
    rows.push({ weekNo: wn++, fechaCorte: ymd, progParcial: 0 });
    cur.setUTCDate(cur.getUTCDate() + 7);
  }
  if (rows[rows.length - 1].fechaCorte !== endDate) {
    rows.push({ weekNo: wn, fechaCorte: endDate, progParcial: 0 });
  }
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  await wipeNonUserData();

  // ── PROJECT 1 ────────────────────────────────────────────────────────────
  console.log('📦 Seeding Project 1: Mantenimiento Menor Autopista Q–I…');
  const p1id = randomUUID();
  const p1AmountIVA = 18013518.78;

  await put({
    PK: `PROJECT#${p1id}`, SK: '#META', GSI1PK: 'PROJECT',
    id: p1id,
    name:         'MANTENIMIENTO MENOR DE LA AUTOPISTA QUERÉTARO – IRAPUATO, INCLUYE ESTRUCTURAS',
    contractNo:   'LO-09-JUI-009JUI002-N-16-2026',
    contractor:   'XARIDU, S.A. DE C.V. / CONSTRUCTORA ARDEA, S.A. DE C.V.',
    amountWithIVA: p1AmountIVA,
    startDate:    '2026-02-23',
    endDate:      '2027-01-31',
    durationDays: 343,
    advance:      0,
    coordinator:  'ING. CARLOS MENDOZA',
    service:      'SUPERVISIÓN DE OBRA',
    createdAt:    new Date().toISOString(),
  });

  // Monthly program P1 — auto-generate skeleton (amounts to be filled by user)
  // But we seed with approximate proportional amounts based on contract total
  const p1MonthProg = [
    { month: '2026-02', monthLabel: 'FEBRERO 2026',    amount: 1466285.02 },
    { month: '2026-03', monthLabel: 'MARZO 2026',      amount: 1657288.40 },
    { month: '2026-04', monthLabel: 'ABRIL 2026',      amount: 1370068.21 },
    { month: '2026-05', monthLabel: 'MAYO 2026',       amount: 282038.46  },
    { month: '2026-06', monthLabel: 'JUNIO 2026',      amount: 242804.92  },
    { month: '2026-07', monthLabel: 'JULIO 2026',      amount: 697237.02  },
    { month: '2026-08', monthLabel: 'AGOSTO 2026',     amount: 1671532.44 },
    { month: '2026-09', monthLabel: 'SEPTIEMBRE 2026', amount: 1727250.16 },
    { month: '2026-10', monthLabel: 'OCTUBRE 2026',    amount: 1758806.25 },
    { month: '2026-11', monthLabel: 'NOVIEMBRE 2026',  amount: 1771232.76 },
    { month: '2026-12', monthLabel: 'DICIEMBRE 2026',  amount: 1713843.64 },
    { month: '2027-01', monthLabel: 'ENERO 2027',      amount: 3655131.50 },
  ];
  await batchWrite(p1MonthProg.map((r) => ({
    PutRequest: {
      Item: { PK: `PROJECT#${p1id}`, SK: `MONTHPROG#${r.month}`, projectId: p1id, ...r, pct: 0, daysInWindow: 0 },
    },
  })));

  // Frente único P1
  const f1id = randomUUID();
  await put({
    PK: `PROJECT#${p1id}`, SK: `FRONT#${f1id}`, GSI1PK: 'FRONT',
    id: f1id, projectId: p1id,
    name:       'FRENTE ÚNICO — AUTOPISTA Q–I',
    location:   'KM 125+000 AL KM 348+000, CUERPO A',
    supervisorId: '',
    amount:     p1AmountIVA,
    createdAt:  new Date().toISOString(),
  });

  // Schedule P1 — real Excel amounts
  const sched1 = buildSchedule(SCHEDULE_P1, p1AmountIVA);
  await batchWrite(sched1.map((r) => ({
    PutRequest: {
      Item: {
        PK: `FRONT#${f1id}`,
        SK: `SCHED#W${String(r.weekNo).padStart(3, '0')}`,
        frontId: f1id,
        ...r,
      },
    },
  })));

  // Weekly reports P1 — Semanas 1–15 (up to current date Aug 2026)
  // Físico: supervisor reported partial physical progress each week
  // We create reports up to Semana 15 with realistic physical progress
  const reportsP1 = [
    { weekNo: 1,  reportDate: '2026-03-02', parcialFisico: 1380000,  parcialFinanciero: 0,       description: 'Inicio de trabajos. Instalación de campamento y señalamiento preventivo. Retiro de vegetación en km 125-128.' },
    { weekNo: 2,  reportDate: '2026-03-09', parcialFisico: 320000,   parcialFinanciero: 0,       description: 'Bacheo y renivelación de carpeta asfáltica km 128+200 al km 131+400. Limpieza de cunetas.' },
    { weekNo: 3,  reportDate: '2026-03-16', parcialFisico: 325000,   parcialFinanciero: 0,       description: 'Continuación bacheo superficial. Sellado de grietas km 131+400 al km 135+000.' },
    { weekNo: 4,  reportDate: '2026-03-23', parcialFisico: 318000,   parcialFinanciero: 0,       description: 'Renivelación con mezcla asfáltica km 135+000 al km 138+600. Señalamiento horizontal.' },
    { weekNo: 5,  reportDate: '2026-03-30', parcialFisico: 328500,   parcialFinanciero: 0,       description: 'Bacheo km 138+600 al km 142+000. Reparación de guarniciones dañadas.' },
    { weekNo: 6,  reportDate: '2026-04-06', parcialFisico: 335000,   parcialFinanciero: 0,       description: 'Tratamiento superficial doble km 142+000 al km 146+200. Limpieza de drenes.' },
    { weekNo: 7,  reportDate: '2026-04-13', parcialFisico: 338000,   parcialFinanciero: 0,       description: 'Continuación TSD km 146+200 al km 150+500. Reparación de juntas de puentes.' },
    { weekNo: 8,  reportDate: '2026-04-20', parcialFisico: 340000,   parcialFinanciero: 0,       description: 'TSD km 150+500 al km 155+000. Bacheo profundo en zona de fallas.' },
    { weekNo: 9,  reportDate: '2026-04-27', parcialFisico: 340000,   parcialFinanciero: 0,       description: 'Renivelación km 155+000 al km 159+800. Reposición de señales verticales.' },
    { weekNo: 10, reportDate: '2026-05-04', parcialFisico: 180000,   parcialFinanciero: 0,       description: 'Trabajos en estructuras: limpieza e hidrofugado de tablero P.V. El Tigre. Semana reducida por lluvia.' },
    { weekNo: 11, reportDate: '2026-05-11', parcialFisico: 68000,    parcialFinanciero: 0,       description: 'Diagnóstico estructural puentes km 162+200 y km 167+400. Toma de muestras concreto.' },
    { weekNo: 12, reportDate: '2026-05-18', parcialFisico: 69500,    parcialFinanciero: 0,       description: 'Reparación de barandales metálicos km 162+200. Pintura epóxica en vigas.' },
    { weekNo: 13, reportDate: '2026-05-25', parcialFisico: 70000,    parcialFinanciero: 0,       description: 'Inyección de grietas en losa tablero km 167+400. Continuación señalamiento horizontal.' },
    { weekNo: 14, reportDate: '2026-06-01', parcialFisico: 67000,    parcialFinanciero: 0,       description: 'Bacheo y sellado de grietas km 270+000 al km 275+400. Limpieza de alcantarillas.' },
    { weekNo: 15, reportDate: '2026-06-08', parcialFisico: 58500,    parcialFinanciero: 0,       description: 'Renivelación con mezcla en frío km 275+400 al km 279+000. Revisión de obras de drenaje.' },
  ];

  let acumFisico = 0;
  let acumFinanciero = 0;
  for (const r of reportsP1) {
    const schedRow = sched1.find((s) => s.weekNo === r.weekNo) ?? sched1[0];
    acumFisico      = parseFloat((acumFisico      + r.parcialFisico).toFixed(2));
    acumFinanciero  = parseFloat((acumFinanciero  + r.parcialFinanciero).toFixed(2));
    const rid = randomUUID();
    await put({
      PK: `FRONT#${f1id}`,
      SK: `REPORT#${String(r.weekNo).padStart(3, '0')}`,
      GSI1PK: 'REPORT',
      id: rid, frontId: f1id,
      weekNo:               r.weekNo,
      reportDate:           r.reportDate,
      progParcialScheduled: schedRow.progParcial,
      progAcumScheduled:    schedRow.progAcumulado,
      progPctScheduled:     schedRow.progAcumuladoPct,
      avanceFisicoReal:          r.parcialFisico,
      avanceFisicoRealAcum:      acumFisico,
      avanceFisicoPct:           parseFloat(((acumFisico / p1AmountIVA) * 100).toFixed(4)),
      avanceFinancieroReal:      r.parcialFinanciero,
      avanceFinancieroRealAcum:  acumFinanciero,
      avanceFinancieroPct:       parseFloat(((acumFinanciero / p1AmountIVA) * 100).toFixed(4)),
      description:    r.description,
      observations:   '',
      photos:         [],
      submittedBy:    'luis@anma.mx',
      submittedByName: 'Luis Loustaunau',
      submittedAt:    new Date().toISOString(),
      createdAt:      new Date().toISOString(),
    });
  }

  // Estimaciones P1 — 2 paid + 1 pending
  const estimationsP1 = [
    {
      estimationNo: 'ESTIMACIÓN 01',
      period:       'FEBRERO–MARZO 2026',
      periodMonth:  '2026-03',
      amount:       1500000.00,
      deductions:   0,
      invoiceNo:    'A-0041',
      status:       'PAGADA',
      submittedDate:'2026-04-05',
      paidDate:     '2026-04-28',
    },
    {
      estimationNo: 'ESTIMACIÓN 02',
      period:       'ABRIL 2026',
      periodMonth:  '2026-04',
      amount:       1350000.00,
      deductions:   27000,
      invoiceNo:    'A-0058',
      status:       'PAGADA',
      submittedDate:'2026-05-06',
      paidDate:     '2026-05-29',
    },
    {
      estimationNo: 'ESTIMACIÓN 03',
      period:       'MAYO–JUNIO 2026',
      periodMonth:  '2026-06',
      amount:       480000.00,
      deductions:   0,
      invoiceNo:    'A-0072',
      status:       'EN_REVISION',
      submittedDate:'2026-07-03',
      paidDate:     null,
    },
  ];

  for (const e of estimationsP1) {
    const eid = randomUUID();
    const amtIVA = parseFloat((e.amount * 1.16).toFixed(2));
    const liquid = parseFloat((amtIVA - e.deductions).toFixed(2));
    await put({
      PK: `PROJECT#${p1id}`, SK: `ESTIMATION#${e.periodMonth}#${eid}`,
      GSI1PK: 'ESTIMATION',
      id: eid, projectId: p1id,
      estimationNo:  e.estimationNo,
      period:        e.period,
      periodMonth:   e.periodMonth,
      amount:        e.amount,
      deductions:    e.deductions,
      amountWithIVA: amtIVA,
      liquid,
      invoiceNo:     e.invoiceNo,
      status:        e.status,
      submittedDate: e.submittedDate,
      paidDate:      e.paidDate,
      createdAt:     new Date().toISOString(),
    });
  }

  console.log('   ✅ Project 1 done.\n');

  // ── PROJECT 2 ────────────────────────────────────────────────────────────
  console.log('📦 Seeding Project 2: Supervisión y Verificación de Calidad…');
  const p2id = randomUUID();
  const p2AmountSinIVA = 3325588.75;
  const p2AmountIVA    = parseFloat((p2AmountSinIVA * 1.16).toFixed(2)); // 3,857,682.55

  await put({
    PK: `PROJECT#${p2id}`, SK: '#META', GSI1PK: 'PROJECT',
    id: p2id,
    name:         'SUPERVISIÓN Y VERIFICACIÓN DE CALIDAD DE LA OBRA: TRATAMIENTO SUPERFICIAL KM 125+000 AL KM 348+000, CUERPO A DE LA AUTOPISTA MÉXICO–QUERÉTARO',
    contractNo:   '450003757I',
    contractor:   'CAMINOS Y PUENTES FEDERALES DE INGRESOS Y SERVICIOS CONEXOS',
    amountWithIVA: p2AmountIVA,
    startDate:    '2026-06-04',
    endDate:      '2027-01-14',
    durationDays: 224,
    advance:      0,
    coordinator:  'ING. MARTHA SALGADO',
    service:      'SUPERVISIÓN DE OBRA',
    createdAt:    new Date().toISOString(),
  });

  // Monthly program P2 — real Excel data
  const totalP2 = p2MonthProg => p2MonthProg.reduce((s, r) => s + r.amount, 0);
  await batchWrite(MONTH_PROGRAM_P2.map((r) => ({
    PutRequest: {
      Item: {
        PK:  `PROJECT#${p2id}`,
        SK:  `MONTHPROG#${r.month}`,
        projectId: p2id,
        ...r,
        pct: parseFloat(((r.amount / p2AmountSinIVA) * 100).toFixed(4)),
        daysInWindow: 0,
      },
    },
  })));

  // Frente único P2
  const f2id = randomUUID();
  await put({
    PK: `PROJECT#${p2id}`, SK: `FRONT#${f2id}`, GSI1PK: 'FRONT',
    id: f2id, projectId: p2id,
    name:       'FRENTE ÚNICO — SUPERVISIÓN TRATAMIENTO SUPERFICIAL',
    location:   'AUTOPISTA MÉXICO–QUERÉTARO, KM 125+000–348+000',
    supervisorId: '',
    amount:     p2AmountIVA,
    createdAt:  new Date().toISOString(),
  });

  // Schedule P2 — skeleton (no amounts yet — project just started Jun 4)
  const skelP2 = buildSimpleSchedule('2026-06-04', '2027-01-14');
  await batchWrite(skelP2.map((r) => ({
    PutRequest: {
      Item: {
        PK: `FRONT#${f2id}`,
        SK: `SCHED#W${String(r.weekNo).padStart(3, '0')}`,
        frontId: f2id,
        ...r,
        progParcialPct: 0, progAcumulado: 0, progAcumuladoPct: 0,
      },
    },
  })));

  // Reports P2 — Semanas 1–11 (Jun 4 to Aug 18 2026)
  const reportsP2 = [
    { weekNo: 1,  reportDate: '2026-06-08', parcialFisico: 380000,  description: 'Inicio de supervisión. Revisión de proyecto ejecutivo y plan de trabajo. Verificación de señalamiento. Toma de condiciones iniciales de carpeta.' },
    { weekNo: 2,  reportDate: '2026-06-15', parcialFisico: 390000,  description: 'Supervisión de preparación de superficie. Limpieza con barredora mecánica km 125–132. Verificación de espesores de mezcla.' },
    { weekNo: 3,  reportDate: '2026-06-22', parcialFisico: 385000,  description: 'Supervisión TSD km 132–140. Control de temperatura de mezcla asfáltica. Pruebas de compactación.' },
    { weekNo: 4,  reportDate: '2026-06-29', parcialFisico: 392000,  description: 'Supervisión TSD km 140–148. Verificación de granulometría de material pétreo. Revisión de señalamiento horizontal.' },
    { weekNo: 5,  reportDate: '2026-07-06', parcialFisico: 388000,  description: 'Supervisión bacheo profundo km 148–156. Control de mezcla en planta. Pruebas de densidad in situ.' },
    { weekNo: 6,  reportDate: '2026-07-13', parcialFisico: 395000,  description: 'Supervisión TSD km 156–165. Verificación de dosificación de emulsión. Revisión de estructuras km 162+200.' },
    { weekNo: 7,  reportDate: '2026-07-20', parcialFisico: 391000,  description: 'Supervisión TSD km 165–174. Pruebas de adherencia granulometría. Señalamiento vertical: 12 señales instaladas.' },
    { weekNo: 8,  reportDate: '2026-07-27', parcialFisico: 393000,  description: 'Supervisión TSD km 174–183. Control de temperatura ambiente y de mezcla. Revisión de drenes y cunetas.' },
    { weekNo: 9,  reportDate: '2026-08-03', parcialFisico: 385000,  description: 'Supervisión bacheo km 183–192. Verificación de espesores. Revisión de puentes km 186+400 y km 191+200.' },
    { weekNo: 10, reportDate: '2026-08-10', parcialFisico: 390000,  description: 'Supervisión TSD km 192–210. Control de calidad de emulsión asfáltica. Reporte fotográfico de avance.' },
    { weekNo: 11, reportDate: '2026-08-17', parcialFisico: 387000,  description: 'Supervisión TSD km 210–228. Pruebas de resistencia al deslizamiento. Señalamiento horizontal en zona de trabajo.' },
  ];

  let acumFisicoP2 = 0;
  for (const r of reportsP2) {
    acumFisicoP2 = parseFloat((acumFisicoP2 + r.parcialFisico).toFixed(2));
    const rid = randomUUID();
    await put({
      PK: `FRONT#${f2id}`,
      SK: `REPORT#${String(r.weekNo).padStart(3, '0')}`,
      GSI1PK: 'REPORT',
      id: rid, frontId: f2id,
      weekNo:               r.weekNo,
      reportDate:           r.reportDate,
      progParcialScheduled: 0,
      progAcumScheduled:    0,
      progPctScheduled:     0,
      avanceFisicoReal:         r.parcialFisico,
      avanceFisicoRealAcum:     acumFisicoP2,
      avanceFisicoPct:          parseFloat(((acumFisicoP2 / p2AmountIVA) * 100).toFixed(4)),
      avanceFinancieroReal:     0,
      avanceFinancieroRealAcum: 0,
      avanceFinancieroPct:      0,
      description:    r.description,
      observations:   '',
      photos:         [],
      submittedBy:    'luis@anma.mx',
      submittedByName: 'Luis Loustaunau',
      submittedAt:    new Date().toISOString(),
      createdAt:      new Date().toISOString(),
    });
  }

  // Estimaciones P2 — 1 pagada, 1 en revisión
  const estimationsP2 = [
    {
      estimationNo: 'ESTIMACIÓN 01',
      period:       'JUNIO 2026',
      periodMonth:  '2026-06',
      amount:       415000.00,
      deductions:   8300,
      invoiceNo:    'B-0019',
      status:       'PAGADA',
      submittedDate:'2026-07-08',
      paidDate:     '2026-07-30',
    },
    {
      estimationNo: 'ESTIMACIÓN 02',
      period:       'JULIO 2026',
      periodMonth:  '2026-07',
      amount:       462000.00,
      deductions:   0,
      invoiceNo:    'B-0031',
      status:       'EN_REVISION',
      submittedDate:'2026-08-05',
      paidDate:     null,
    },
  ];

  for (const e of estimationsP2) {
    const eid = randomUUID();
    const amtIVA = parseFloat((e.amount * 1.16).toFixed(2));
    const liquid = parseFloat((amtIVA - e.deductions).toFixed(2));
    await put({
      PK: `PROJECT#${p2id}`, SK: `ESTIMATION#${e.periodMonth}#${eid}`,
      GSI1PK: 'ESTIMATION',
      id: eid, projectId: p2id,
      estimationNo:  e.estimationNo,
      period:        e.period,
      periodMonth:   e.periodMonth,
      amount:        e.amount,
      deductions:    e.deductions,
      amountWithIVA: amtIVA,
      liquid,
      invoiceNo:     e.invoiceNo,
      status:        e.status,
      submittedDate: e.submittedDate,
      paidDate:      e.paidDate,
      createdAt:     new Date().toISOString(),
    });
  }

  console.log('   ✅ Project 2 done.\n');

  // ── PROJECT 3 ────────────────────────────────────────────────────────────
  console.log('📦 Seeding Project 3: Inspección Estructural Puentes Irapuato…');
  const p3id = randomUUID();
  const p3AmountIVA = 2784200.00;
  const p3AmountSinIVA = parseFloat((p3AmountIVA / 1.16).toFixed(2));

  await put({
    PK: `PROJECT#${p3id}`, SK: '#META', GSI1PK: 'PROJECT',
    id: p3id,
    name:         'INSPECCIÓN Y DIAGNÓSTICO ESTRUCTURAL: PUENTES Y OBRAS DE DRENAJE, TRAMO IRAPUATO–ARANDAS',
    contractNo:   'CAPUFE-SUP-003-2026',
    contractor:   'CAMINOS Y PUENTES FEDERALES DE INGRESOS Y SERVICIOS CONEXOS',
    amountWithIVA: p3AmountIVA,
    startDate:    '2026-04-01',
    endDate:      '2026-10-31',
    durationDays: 213,
    advance:      120000,
    coordinator:  'ING. ROBERTO ÁVILA',
    service:      'INSPECCIÓN ESTRUCTURAL',
    createdAt:    new Date().toISOString(),
  });

  const p3MonthProg = [
    { month: '2026-04', monthLabel: 'ABRIL 2026',      amount: 180000.00 },
    { month: '2026-05', monthLabel: 'MAYO 2026',       amount: 320000.00 },
    { month: '2026-06', monthLabel: 'JUNIO 2026',      amount: 380000.00 },
    { month: '2026-07', monthLabel: 'JULIO 2026',      amount: 420000.00 },
    { month: '2026-08', monthLabel: 'AGOSTO 2026',     amount: 490000.00 },
    { month: '2026-09', monthLabel: 'SEPTIEMBRE 2026', amount: 380172.41 },
    { month: '2026-10', monthLabel: 'OCTUBRE 2026',    amount: 230000.00 },
  ];

  await batchWrite(p3MonthProg.map((r) => ({
    PutRequest: {
      Item: {
        PK: `PROJECT#${p3id}`, SK: `MONTHPROG#${r.month}`,
        projectId: p3id,
        ...r,
        pct: parseFloat(((r.amount / p3AmountSinIVA) * 100).toFixed(4)),
        daysInWindow: 0,
      },
    },
  })));

  // Frente único P3
  const f3id = randomUUID();
  await put({
    PK: `PROJECT#${p3id}`, SK: `FRONT#${f3id}`, GSI1PK: 'FRONT',
    id: f3id, projectId: p3id,
    name:       'FRENTE ÚNICO — INSPECCIÓN ESTRUCTURAL',
    location:   'TRAMO IRAPUATO–ARANDAS, AUTOPISTA FEDERAL',
    supervisorId: '',
    amount:     p3AmountIVA,
    createdAt:  new Date().toISOString(),
  });

  // Schedule P3 — skeleton
  const skelP3 = buildSimpleSchedule('2026-04-01', '2026-10-31');
  await batchWrite(skelP3.map((r) => ({
    PutRequest: {
      Item: {
        PK: `FRONT#${f3id}`,
        SK: `SCHED#W${String(r.weekNo).padStart(3, '0')}`,
        frontId: f3id,
        ...r,
        progParcialPct: 0, progAcumulado: 0, progAcumuladoPct: 0,
      },
    },
  })));

  // Reports P3 — Semanas 1–19 (Apr 1 to Aug 18)
  const reportsP3 = [
    { weekNo: 1,  reportDate: '2026-04-06', parcialFisico: 165000, description: 'Inicio de inspecciones. Levantamiento topográfico general del tramo. Revisión de 4 puentes en sector km 0+000–15+000.' },
    { weekNo: 2,  reportDate: '2026-04-13', parcialFisico: 170000, description: 'Inspección visual detallada puentes km 15+000–30+000. Detección de grietas flexión en vigas principales, 2 estructuras.' },
    { weekNo: 3,  reportDate: '2026-04-20', parcialFisico: 172000, description: 'Pruebas de esclerometría y extracción de núcleos en losas. Inspección de apoyos y bancos de nivel.' },
    { weekNo: 4,  reportDate: '2026-04-27', parcialFisico: 168000, description: 'Inspección subsuelo alcantarillas km 30+000–45+000. Batimetría de cauces. Revisión de armado con pachómetro.' },
    { weekNo: 5,  reportDate: '2026-05-04', parcialFisico: 175000, description: 'Pruebas de carbonatación en elementos de concreto. Revisión de 6 puentes km 45+000–65+000.' },
    { weekNo: 6,  reportDate: '2026-05-11', parcialFisico: 178000, description: 'Análisis de resultados de laboratorio. Dictamen preliminar estructuras km 0–45. Elaboración de informes parciales.' },
    { weekNo: 7,  reportDate: '2026-05-18', parcialFisico: 176000, description: 'Inspección puentes km 65+000–82+000. Revisión de sistemas de drenaje y sellos de junta. 3 estructuras con daño leve.' },
    { weekNo: 8,  reportDate: '2026-05-25', parcialFisico: 174000, description: 'Inspección subestructura (estribos y pilas) km 65–82. Medición de socavaciones. Propuestas de reparación.' },
    { weekNo: 9,  reportDate: '2026-06-01', parcialFisico: 182000, description: 'Inspección km 82+000–100+000. Revisión de 5 alcantarillas cuadradas con azolve. Inicio de informe ejecutivo.' },
    { weekNo: 10, reportDate: '2026-06-08', parcialFisico: 185000, description: 'Pruebas dinámicas en puente km 91+400. Medición de frecuencias naturales y amortiguamiento.' },
    { weekNo: 11, reportDate: '2026-06-15', parcialFisico: 183000, description: 'Inspección km 100+000–118+000. Revisión de 4 viaductos. Detección de delaminación en tableros.' },
    { weekNo: 12, reportDate: '2026-06-22', parcialFisico: 184000, description: 'Análisis de imágenes termográficas tableros km 100–118. Cuantificación de área afectada por corrosión.' },
    { weekNo: 13, reportDate: '2026-06-29', parcialFisico: 181000, description: 'Inspección final tramo km 118+000–135+000. Revisión de señalamiento vial en zonas de obra.' },
    { weekNo: 14, reportDate: '2026-07-06', parcialFisico: 192000, description: 'Inicio 2a vuelta de inspección. Verificación de reparaciones ejecutadas. Inspección nocturna km 0–30.' },
    { weekNo: 15, reportDate: '2026-07-13', parcialFisico: 195000, description: 'Verificación de reparaciones km 30–65. Pruebas de adherencia en reparaciones con mezcla epóxica.' },
    { weekNo: 16, reportDate: '2026-07-20', parcialFisico: 193000, description: 'Inspección de mantenimiento preventivo km 65–100. Revisión de juntas de expansión reemplazadas.' },
    { weekNo: 17, reportDate: '2026-07-27', parcialFisico: 194000, description: 'Verificación de reparaciones km 100–135. Pruebas de resistencia a compresión en reparaciones.' },
    { weekNo: 18, reportDate: '2026-08-03', parcialFisico: 198000, description: 'Revisión integral del tramo. Cuantificación de volúmenes de reparaciones adicionales detectadas.' },
    { weekNo: 19, reportDate: '2026-08-10', parcialFisico: 197000, description: 'Elaboración de expediente final de inspección. Entrega de dictámenes preliminares al cliente.' },
  ];

  let acumFisicoP3 = 0;
  for (const r of reportsP3) {
    acumFisicoP3 = parseFloat((acumFisicoP3 + r.parcialFisico).toFixed(2));
    const rid = randomUUID();
    await put({
      PK: `FRONT#${f3id}`,
      SK: `REPORT#${String(r.weekNo).padStart(3, '0')}`,
      GSI1PK: 'REPORT',
      id: rid, frontId: f3id,
      weekNo:               r.weekNo,
      reportDate:           r.reportDate,
      progParcialScheduled: 0,
      progAcumScheduled:    0,
      progPctScheduled:     0,
      avanceFisicoReal:         r.parcialFisico,
      avanceFisicoRealAcum:     acumFisicoP3,
      avanceFisicoPct:          parseFloat(((acumFisicoP3 / p3AmountIVA) * 100).toFixed(4)),
      avanceFinancieroReal:     0,
      avanceFinancieroRealAcum: 0,
      avanceFinancieroPct:      0,
      description:    r.description,
      observations:   '',
      photos:         [],
      submittedBy:    'luis@anma.mx',
      submittedByName: 'Luis Loustaunau',
      submittedAt:    new Date().toISOString(),
      createdAt:      new Date().toISOString(),
    });
  }

  // Estimaciones P3 — 3 paid, 1 approved, 1 pending
  const estimationsP3 = [
    {
      estimationNo: 'ESTIMACIÓN 01',
      period:       'ABRIL 2026',
      periodMonth:  '2026-04',
      amount:       178500.00,
      deductions:   0,
      invoiceNo:    'C-0007',
      status:       'PAGADA',
      submittedDate:'2026-05-04',
      paidDate:     '2026-05-26',
    },
    {
      estimationNo: 'ESTIMACIÓN 02',
      period:       'MAYO 2026',
      periodMonth:  '2026-05',
      amount:       315000.00,
      deductions:   6300,
      invoiceNo:    'C-0014',
      status:       'PAGADA',
      submittedDate:'2026-06-03',
      paidDate:     '2026-06-25',
    },
    {
      estimationNo: 'ESTIMACIÓN 03',
      period:       'JUNIO 2026',
      periodMonth:  '2026-06',
      amount:       374000.00,
      deductions:   0,
      invoiceNo:    'C-0022',
      status:       'PAGADA',
      submittedDate:'2026-07-06',
      paidDate:     '2026-07-28',
    },
    {
      estimationNo: 'ESTIMACIÓN 04',
      period:       'JULIO 2026',
      periodMonth:  '2026-07',
      amount:       418000.00,
      deductions:   8360,
      invoiceNo:    'C-0029',
      status:       'APROBADA',
      submittedDate:'2026-08-04',
      paidDate:     null,
    },
    {
      estimationNo: 'ESTIMACIÓN 05',
      period:       'AGOSTO 2026',
      periodMonth:  '2026-08',
      amount:       0,
      deductions:   0,
      invoiceNo:    null,
      status:       'POR_INGRESAR',
      submittedDate: null,
      paidDate:     null,
    },
  ];

  for (const e of estimationsP3) {
    const eid = randomUUID();
    const amtIVA = parseFloat((e.amount * 1.16).toFixed(2));
    const liquid = parseFloat((amtIVA - e.deductions).toFixed(2));
    await put({
      PK: `PROJECT#${p3id}`, SK: `ESTIMATION#${e.periodMonth}#${eid}`,
      GSI1PK: 'ESTIMATION',
      id: eid, projectId: p3id,
      estimationNo:  e.estimationNo,
      period:        e.period,
      periodMonth:   e.periodMonth,
      amount:        e.amount,
      deductions:    e.deductions,
      amountWithIVA: amtIVA,
      liquid,
      invoiceNo:     e.invoiceNo,
      status:        e.status,
      submittedDate: e.submittedDate,
      paidDate:      e.paidDate,
      createdAt:     new Date().toISOString(),
    });
  }

  console.log('   ✅ Project 3 done.\n');

  console.log('🎉 Seed complete!');
  console.log('');
  console.log('Projects seeded:');
  console.log(`  1. Mantenimiento Menor Autopista Q–I       (${p1id})`);
  console.log(`  2. Supervisión y Verificación de Calidad   (${p2id})`);
  console.log(`  3. Inspección Estructural Puentes Irapuato (${p3id})`);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
