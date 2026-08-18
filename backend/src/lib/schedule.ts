/**
 * Generate a weekly schedule skeleton between two dates.
 * Week numbers and cutoff dates are computed automatically.
 * progParcial / progAcumulado are left at 0 — they must be provided
 * by the user (manual entry or paste from Excel).  The app then
 * recalculates percentages and accumulated values on save.
 *
 * Each row corresponds to a Monday cut-off, matching ANMA's cadence.
 */
export interface ScheduleRow {
  weekNo: number;
  fechaCorte: string;        // YYYY-MM-DD
  progParcial: number;       // $ for that week
  progParcialPct: number;    // % of total contract
  progAcumulado: number;     // $ accumulated by end of week
  progAcumuladoPct: number;  // % accumulated
}

function ymd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d.getTime());
  c.setUTCDate(c.getUTCDate() + n);
  return c;
}

function nextMonday(d: Date): Date {
  // Returns the next Monday strictly after d (never the same day).
  // JS getUTCDay(): Sun=0, Mon=1, ..., Sat=6
  const day = d.getUTCDay();
  // If already Monday, advance a full week; otherwise snap to next Mon.
  const offset = day === 1 ? 7 : (8 - day) % 7;
  return addDays(d, offset);
}

export function generateSchedule(
  startDate: string,
  endDate: string,
  _totalAmount?: number   // kept for signature compatibility, not used
): ScheduleRow[] {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  if (end < start) return [];

  const rows: ScheduleRow[] = [];

  // Week 0 — the contract opening day, $0
  rows.push({
    weekNo: 0,
    fechaCorte: ymd(start),
    progParcial: 0,
    progParcialPct: 0,
    progAcumulado: 0,
    progAcumuladoPct: 0,
  });

  // First cutoff = the Monday strictly after the start date (never same day).
  let cutoff = nextMonday(start);
  let weekNo = 0;

  while (cutoff <= end) {
    weekNo++;
    rows.push({
      weekNo,
      fechaCorte: ymd(cutoff),
      progParcial: 0,
      progParcialPct: 0,
      progAcumulado: 0,
      progAcumuladoPct: 0,
    });
    cutoff = addDays(cutoff, 7);
  }

  // If the contract end date doesn't land on a Monday, add a final row for it.
  const lastFecha = rows[rows.length - 1].fechaCorte;
  if (lastFecha !== ymd(end)) {
    weekNo++;
    rows.push({
      weekNo,
      fechaCorte: ymd(end),
      progParcial: 0,
      progParcialPct: 0,
      progAcumulado: 0,
      progAcumuladoPct: 0,
    });
  }

  return rows;
}

/**
 * Generate a per-month "programa de estimaciones" skeleton between two dates.
 * Amounts are left at 0 — ANMA must supply the approved monthly planned amounts
 * (paste from Excel or manual entry). The app stores them as-is.
 */
export interface MonthProgramRow {
  month: string;       // YYYY-MM
  monthLabel: string;  // "JUNIO 2026"
  amount: number;      // $ planned for the month (entered by user)
  pct: number;         // % of total (recalculated on save)
  daysInWindow: number;
}

const MONTH_NAMES_ES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

export function generateMonthProgram(
  startDate: string,
  endDate: string,
  _totalAmount?: number   // kept for signature compatibility, not used
): MonthProgramRow[] {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  if (end < start) return [];

  const rows: MonthProgramRow[] = [];
  let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));

  while (cursor <= end) {
    const y = cursor.getUTCFullYear();
    const m = cursor.getUTCMonth();
    rows.push({
      month: `${y}-${String(m + 1).padStart(2, '0')}`,
      monthLabel: `${MONTH_NAMES_ES[m]} ${y}`,
      amount: 0,
      pct: 0,
      daysInWindow: 0,
    });
    cursor = new Date(Date.UTC(y, m + 1, 1));
  }

  return rows;
}
