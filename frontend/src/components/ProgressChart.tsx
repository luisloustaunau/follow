import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ScheduleRow, WeeklyReport } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  schedule: ScheduleRow[];
  reports: WeeklyReport[];
}

function fmt(val: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(val);
}

export function ProgressChart({ schedule, reports }: Props) {
  // Build a unified data set keyed by weekNo
  const reportMap = new Map(reports.map((r) => [r.weekNo, r]));

  const data = schedule.map((row) => {
    const report = reportMap.get(row.weekNo);
    return {
      week: `S${row.weekNo}`,
      fecha: format(parseISO(row.fechaCorte), 'd MMM', { locale: es }),
      programado: row.progAcum,
      real: report ? report.avanceFinancieroRealAcum : null,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="fecha" tick={{ fontSize: 11 }} interval={3} />
        <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11 }} width={90} />
        <Tooltip formatter={(v) => typeof v === 'number' ? fmt(v) : v} />
        <Legend />
        <Line
          type="monotone"
          dataKey="programado"
          name="Programado"
          stroke="#3b82f6"
          dot={false}
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="real"
          name="Real"
          stroke="#22c55e"
          dot={{ r: 3 }}
          strokeWidth={2}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
