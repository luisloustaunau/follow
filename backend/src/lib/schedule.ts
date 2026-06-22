/**
 * Generate a weekly schedule between two dates, distributing the
 * contract amount proportionally by number of days each week falls
 * inside the contract window.
 *
 * Each row corresponds to a "week ending on Monday" cut-off, matching
 * ANMA's existing reporting cadence (Fecha Corte = lunes).
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
  // Returns the Monday on or after d. JS getUTCDay(): Sun=0, Mon=1, ..., Sat=6
  const day = d.getUTCDay();
  const offset = day === 1 ? 0 : (8 - day) % 7;
  return addDays(d, offset);
}

export function generateSchedule(
  startDate: string,
  endDate: string,
  totalAmount: number
): ScheduleRow[] {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  if (end < start) return [];

  const totalDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1
  );
  const perDay = totalAmount / totalDays;

  const rows: ScheduleRow[] = [];

  // First "fecha corte" = the first Monday on or after the start date.
  // Row 0 is the contract opening (week 0).
  let cutoff = nextMonday(start);
  let weekNo = 0;
  let acum = 0;

  // Week 0 — the contract opening day, $0
  rows.push({
    weekNo: 0,
    fechaCorte: ymd(start),
    progParcial: 0,
    progParcialPct: 0,
    progAcumulado: 0,
    progAcumuladoPct: 0,
  });

  // Then one row per Monday up to (and including) the cut-off that lands
  // on or after the end date.
  while (cutoff <= end) {
    weekNo++;
    const windowStart = weekNo === 1 ? start : addDays(cutoff, -6);
    const windowEnd = cutoff < end ? cutoff : end;
    const days = Math.max(
      1,
      Math.ceil((windowEnd.getTime() - windowStart.getTime()) / 86_400_000) + 1
    );
    const parcial = Number((perDay * days).toFixed(2));
    acum = Number((acum + parcial).toFixed(2));

    rows.push({
      weekNo,
      fechaCorte: ymd(cutoff),
      progParcial: parcial,
      progParcialPct: Number(((parcial / totalAmount) * 100).toFixed(4)),
      progAcumulado: acum,
      progAcumuladoPct: Number(((acum / totalAmount) * 100).toFixed(4)),
    });

    cutoff = addDays(cutoff, 7);
  }

  // If the last row didn't land exactly on the end date, add a final stub
  // for the remaining days (no extra row if end was exactly a Monday).
  const lastFecha = rows[rows.length - 1].fechaCorte;
  if (lastFecha !== ymd(end)) {
    const lastCutoff = new Date(`${lastFecha}T00:00:00Z`);
    const days = Math.max(
      1,
      Math.ceil((end.getTime() - lastCutoff.getTime()) / 86_400_000)
    );
    const parcial = Number((perDay * days).toFixed(2));
    acum = Number((acum + parcial).toFixed(2));
    weekNo++;
    rows.push({
      weekNo,
      fechaCorte: ymd(end),
      progParcial: parcial,
      progParcialPct: Number(((parcial / totalAmount) * 100).toFixed(4)),
      progAcumulado: acum,
      progAcumuladoPct: Number(((acum / totalAmount) * 100).toFixed(4)),
    });
  }

  // Force the last accumulated value to equal the total (kill rounding drift)
  const lastIdx = rows.length - 1;
  rows[lastIdx].progAcumulado = totalAmount;
  rows[lastIdx].progAcumuladoPct = 100;

  return rows;
}

/**
 * Generate a per-month "programa" between two dates, distributing the
 * contract amount proportionally by number of days each month falls
 * inside the contract window. Matches Regina's "IMPORTES PROGRAMADOS"
 * grid (Jun $417k partial, Jul–Dic $466k full, Ene $107k partial).
 */
export interface MonthProgramRow {
  month: string;       // YYYY-MM
  monthLabel: string;  // "JUNIO 2026"
  amount: number;      // $ planned for the month
  pct: number;         // % of total
  daysInWindow: number;
}

const MONTH_NAMES_ES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

export function generateMonthProgram(
  startDate: string,
  endDate: string,
  totalAmount: number
): MonthProgramRow[] {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  if (end < start) return [];

  const totalDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1
  );
  const perDay = totalAmount / totalDays;

  const rows: MonthProgramRow[] = [];
  let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));

  while (cursor <= end) {
    const y = cursor.getUTCFullYear();
    const m = cursor.getUTCMonth();
    const monthStart = new Date(Date.UTC(y, m, 1));
    const monthEnd = new Date(Date.UTC(y, m + 1, 0));
    const windowStart = monthStart < start ? start : monthStart;
    const windowEnd = monthEnd > end ? end : monthEnd;
    const days = Math.max(
      0,
      Math.ceil((windowEnd.getTime() - windowStart.getTime()) / 86_400_000) + 1
    );
    if (days > 0) {
      const amount = Number((perDay * days).toFixed(2));
      rows.push({
        month: `${y}-${String(m + 1).padStart(2, '0')}`,
        monthLabel: `${MONTH_NAMES_ES[m]} ${y}`,
        amount,
        pct: Number(((amount / totalAmount) * 100).toFixed(4)),
        daysInWindow: days,
      });
    }
    cursor = new Date(Date.UTC(y, m + 1, 1));
  }

  // Kill rounding drift on the last row
  if (rows.length > 0) {
    const sum = rows.reduce((s, r) => s + r.amount, 0);
    const diff = Number((totalAmount - sum).toFixed(2));
    if (Math.abs(diff) > 0.01) {
      rows[rows.length - 1].amount = Number(
        (rows[rows.length - 1].amount + diff).toFixed(2)
      );
    }
  }

  return rows;
}
