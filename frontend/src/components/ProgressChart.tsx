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

interface Props {
  schedule: ScheduleRow[];
  reports: WeeklyReport[];
  height?: number;
}

function fmt(val: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(val);
}

interface TickDatum {
  semana: string;
  fecha: string;
}

interface WeekTickProps {
  x?: number;
  y?: number;
  payload?: { value: string; index: number };
  data?: TickDatum[];
}

/**
 * Two-line X-axis tick: week number (S0, S1…) on top, fecha de corte below.
 * Makes the semana unambiguous so a data point can't be misread as belonging
 * to a neighbouring week.
 */
function WeekTick({ x = 0, y = 0, payload, data }: WeekTickProps) {
  const row = data?.[payload?.index ?? -1];
  const semana = row?.semana ?? '';
  const fecha = payload?.value ?? '';
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={12}
        textAnchor="middle"
        fontSize={10}
        fontWeight={600}
        fill="#6b7280"
      >
        {semana}
      </text>
      <text x={0} y={0} dy={26} textAnchor="middle" fontSize={9} fill="#9ca3af">
        {fecha}
      </text>
    </g>
  );
}

export function ProgressChart({ schedule, reports, height = 320 }: Props) {
  if (schedule.length === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af',
          fontSize: 13,
        }}
      >
        Sin programa de obra — carga uno desde la pestaña "Programa".
      </div>
    );
  }

  const sorted = [...schedule].sort((a, b) => a.weekNo - b.weekNo);
  const reportByWeek = new Map<number, WeeklyReport>();
  reports.forEach((r) => reportByWeek.set(r.weekNo, r));

  // Track running real if the supervisor skipped weeks
  let lastReal: number | null = null;
  const data = sorted.map((row) => {
    const rep = reportByWeek.get(row.weekNo);
    if (rep) lastReal = rep.avanceFinancieroRealAcum;
    return {
      fecha: row.fechaCorte.slice(5),
      semana: `S${row.weekNo}`,
      Programado: row.progAcumulado,
      Real: rep ? rep.avanceFinancieroRealAcum : lastReal,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="fecha"
          height={38}
          interval={data.length <= 12 ? 0 : Math.ceil(data.length / 12) - 1}
          tick={<WeekTick data={data} />}
        />
        <YAxis tickFormatter={(v) => fmt(Number(v))} tick={{ fontSize: 10 }} width={90} />
        <Tooltip
          formatter={(v) => (typeof v === 'number' ? fmt(v) : v ?? '—')}
          labelFormatter={(v, payload) => {
            const row = payload?.[0]?.payload;
            return row ? `${row.semana} · ${row.fecha}` : v;
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="Programado"
          stroke="#3b82f6"
          dot={{ r: 2 }}
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="Real"
          stroke="#16a34a"
          dot={{ r: 3 }}
          strokeWidth={2}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
