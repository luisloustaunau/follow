import { TokenPayload } from './jwt.js';

/**
 * Change history (FUN-009).
 *
 * Scope is deliberately narrow: we record *who changed which field, when, and
 * from what value to what value* on the records that back invoicing and
 * progress claims — estimaciones, reportes semanales y estatus de proyecto.
 *
 * We do NOT log reads or record creation. Creation is already attributable via
 * `submittedBy` / `createdAt`, and logging reads would balloon the item for no
 * operational benefit.
 *
 * The history lives inside the item itself (a `history` list) rather than in a
 * separate audit table. At this data volume that keeps a record and its history
 * atomic and readable in a single query, with no extra infrastructure.
 */

export interface AuditEntry {
  at: string;
  by: string;
  byName: string;
  field: string;
  label: string;
  from: unknown;
  to: unknown;
}

/** Human labels so the UI reads like the Excel it replaces, not a DB dump. */
const FIELD_LABELS: Record<string, string> = {
  // Estimaciones
  status: 'Estatus',
  invoiceNo: 'No. de factura',
  paidDate: 'Fecha de pago',
  submittedDate: 'Fecha de ingreso',
  deductions: 'Deducciones',
  liquid: 'Liquido',
  amount: 'Importe sin IVA',
  amountWithIVA: 'Importe con IVA',
  // Reportes semanales
  parcialFisico: 'Avance fisico de la semana',
  parcialFinanciero: 'Avance financiero de la semana',
  avanceFisicoReal: 'Avance fisico de la semana',
  avanceFinancieroReal: 'Avance financiero de la semana',
  description: 'Descripcion de trabajos',
  observations: 'Observaciones',
  photos: 'Fotografias',
  reportDate: 'Fecha de corte',
  // Proyecto
  projectStatus: 'Estatus del proyecto',
};

export function labelFor(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

/**
 * Normalises a value so `100` and `"100"` don't register as a change.
 * Arrays (photos) compare by length — the useful signal is "se agregaron o
 * quitaron fotos", not which S3 key moved position.
 */
function comparable(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return String(value.length);
  return String(value);
}

/** Photo arrays are summarised rather than dumped into the history. */
function displayable(value: unknown): unknown {
  if (Array.isArray(value)) return `${value.length} foto(s)`;
  if (value === undefined) return null;
  return value;
}

/**
 * Compares the stored record against the incoming payload and returns one entry
 * per field that actually changed. Fields absent from `next` are ignored, so a
 * partial update never produces phantom "changed to empty" entries.
 */
export function diffFields(
  current: Record<string, unknown>,
  next: Record<string, unknown>,
  user: TokenPayload,
  fields: string[]
): AuditEntry[] {
  const at = new Date().toISOString();
  const entries: AuditEntry[] = [];

  for (const field of fields) {
    if (next[field] === undefined) continue;
    const before = current[field];
    const after = next[field];
    if (comparable(before) === comparable(after)) continue;

    entries.push({
      at,
      by: user.email,
      byName: user.name,
      field,
      label: labelFor(field),
      from: displayable(before),
      to: displayable(after),
    });
  }

  return entries;
}

/**
 * Builds the DynamoDB fragments that append `entries` to the item's history and
 * stamp who touched it last.
 *
 * `list_append` + `if_not_exists` means we never read-modify-write the history,
 * so two people saving at once cannot clobber each other's entry, and records
 * created before this feature simply start their history on first edit.
 */
export function auditFragment(entries: AuditEntry[], user: TokenPayload) {
  return {
    clauses: [
      'history = list_append(if_not_exists(history, :auditEmpty), :auditEntries)',
      'lastEditedBy = :auditBy',
      'lastEditedByName = :auditByName',
      'lastEditedAt = :auditAt',
    ],
    values: {
      ':auditEmpty': [] as AuditEntry[],
      ':auditEntries': entries,
      ':auditBy': user.email,
      ':auditByName': user.name,
      ':auditAt': new Date().toISOString(),
    } as Record<string, unknown>,
  };
}
