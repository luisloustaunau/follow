import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getAllReports } from '../lib/api';
import type { EnrichedReport, FrontStatus } from '../lib/api';
import {
  AlertTriangle,
  CheckCircle2,
  Camera,
  ChevronRight,
  Search,
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

function fmtPct(n: number) {
  return `${(n ?? 0).toFixed(2)}%`;
}

type StatusFilter = 'all' | 'ontrack' | 'late' | 'pending';

/**
 * Global "Reportes" view — aggregates every weekly report across every
 * frente of every project. Two stacked sections:
 *   1. Per-frente status grid  (was the last report submitted? how late?)
 *   2. Activity feed of every individual report (newest first)
 *
 * This is the page Regina described:
 *   "que se juntara para mis ojos y para quien yo lo quiera compartir
 *    de cada una de las obras"
 */
export function AllReports() {
  const [data, setData] = useState<{
    reports: EnrichedReport[];
    frontStatus: FrontStatus[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    getAllReports()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const enriched = useMemo(() => {
    if (!data) return [];
    const today = new Date();
    return data.frontStatus.map((fs) => {
      const latest = fs.latestReport;
      const daysSince = latest
        ? differenceInDays(today, parseISO(latest.reportDate))
        : Infinity;
      let status: 'ontrack' | 'late' | 'pending';
      if (!latest) status = 'pending';
      else if (daysSince > 8) status = 'late';
      else status = 'ontrack';
      return { ...fs, daysSince, status };
    });
  }, [data]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return enriched.filter((f) => {
      if (filter !== 'all' && f.status !== filter) return false;
      if (
        query &&
        !`${f.frontName} ${f.projectName} ${f.projectContractNo}`
          .toLowerCase()
          .includes(query)
      )
        return false;
      return true;
    });
  }, [enriched, filter, q]);

  const counts = useMemo(() => {
    return {
      total: enriched.length,
      ontrack: enriched.filter((f) => f.status === 'ontrack').length,
      late: enriched.filter((f) => f.status === 'late').length,
      pending: enriched.filter((f) => f.status === 'pending').length,
    };
  }, [enriched]);

  if (loading) return <p className="text-sm text-gray-400">Cargando…</p>;
  if (!data) return <p className="text-sm text-red-600">Error al cargar.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900" style={{ marginBottom: 4 }}>
        Reportes
      </h1>
      <p className="text-sm text-gray-500" style={{ marginBottom: 20 }}>
        Estado de todos los frentes activos · {counts.total} frentes
      </p>

      {/* Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <SummaryCard
          label="Al día"
          value={counts.ontrack}
          color="#15803d"
          bg="#f0fdf4"
          active={filter === 'ontrack'}
          onClick={() => setFilter(filter === 'ontrack' ? 'all' : 'ontrack')}
        />
        <SummaryCard
          label="Atrasados"
          value={counts.late}
          color="#b45309"
          bg="#fffbeb"
          active={filter === 'late'}
          onClick={() => setFilter(filter === 'late' ? 'all' : 'late')}
        />
        <SummaryCard
          label="Sin reportes"
          value={counts.pending}
          color="#6b7280"
          bg="#f3f4f6"
          active={filter === 'pending'}
          onClick={() => setFilter(filter === 'pending' ? 'all' : 'pending')}
        />
      </div>

      {/* Search */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: '8px 12px',
          marginBottom: 12,
        }}
      >
        <Search size={15} className="text-gray-400" />
        <input
          placeholder="Buscar por obra, frente o contrato…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            border: 'none',
            outline: 'none',
            flex: 1,
            fontSize: 14,
            background: 'transparent',
          }}
        />
      </div>

      {/* Frente status grid */}
      <div className="card" style={{ marginBottom: 24, overflowX: 'auto', padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Proyecto</th>
              <th>Frente</th>
              <th>Último reporte</th>
              <th style={{ textAlign: 'right' }}>Avance</th>
              <th style={{ textAlign: 'right' }}>Reportes</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}
                >
                  Sin frentes con esos criterios
                </td>
              </tr>
            ) : (
              filtered.map((f) => (
                <tr key={f.frontId}>
                  <td>
                    <Link
                      to={`/projects/${f.projectId}`}
                      style={{ color: '#374151', textDecoration: 'none', fontWeight: 500 }}
                    >
                      {f.projectName}
                    </Link>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                      {f.projectContractNo}
                    </p>
                  </td>
                  <td style={{ fontWeight: 500 }}>{f.frontName}</td>
                  <td>
                    {f.latestReport ? (
                      <>
                        <p style={{ fontSize: 13 }}>
                          Semana {f.latestReport.weekNo} —{' '}
                          {format(parseISO(f.latestReport.reportDate), 'd MMM yyyy', { locale: es })}
                        </p>
                        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                          hace {f.daysSince} día{f.daysSince === 1 ? '' : 's'}
                        </p>
                      </>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: 13 }}>
                        Sin reportes aún
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {f.latestReport ? (
                      <span style={{ fontWeight: 600, color: '#16a34a' }}>
                        {fmtPct(f.latestReport.avanceFinancieroPct)}
                      </span>
                    ) : (
                      <span style={{ color: '#d1d5db' }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', color: '#6b7280' }}>
                    {f.reportCount}
                  </td>
                  <td>
                    <StatusPill status={f.status} />
                  </td>
                  <td>
                    <Link
                      to={`/projects/${f.projectId}/fronts/${f.frontId}`}
                      style={{
                        color: '#991b1b',
                        textDecoration: 'none',
                        fontSize: 12,
                        fontWeight: 500,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      Abrir <ChevronRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Activity feed */}
      <h2 className="font-semibold text-gray-800" style={{ marginBottom: 10 }}>
        Actividad reciente
      </h2>
      {data.reports.length === 0 ? (
        <p className="text-sm text-gray-400">Aún no hay reportes en ningún frente.</p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {data.reports.slice(0, 30).map((r) => (
            <Link
              key={r.id}
              to={`/projects/${r.projectId}/fronts/${r.frontId}/reports/${r.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                padding: '12px 16px',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    background: '#fef2f2',
                    color: '#991b1b',
                    borderRadius: 8,
                    padding: '4px 10px',
                    textAlign: 'center',
                    minWidth: 50,
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  S{r.weekNo}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>
                    {r.projectName} · <span style={{ color: '#6b7280' }}>{r.frontName}</span>
                  </p>
                  <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    {format(parseISO(r.reportDate), "d 'de' MMM yyyy", { locale: es })}
                    {r.submittedByName && <> · subido por {r.submittedByName}</>}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 13 }}>
                {r.photos.length > 0 && (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      color: '#6b7280',
                      fontSize: 12,
                    }}
                  >
                    <Camera size={13} /> {r.photos.length}
                  </span>
                )}
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: '#9ca3af' }}>Avance</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>
                    {fmtPct(r.avanceFinancieroPct)}
                  </p>
                </div>
                <ChevronRight size={15} className="text-gray-300" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
  bg,
  active,
  onClick,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: bg,
        border: active ? `2px solid ${color}` : '1px solid #e5e7eb',
        borderRadius: 12,
        padding: '14px 18px',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <p style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 700, color, marginTop: 2 }}>
        {value}
      </p>
    </button>
  );
}

function StatusPill({ status }: { status: 'ontrack' | 'late' | 'pending' }) {
  const config = {
    ontrack: { label: 'Al día', color: '#15803d', bg: '#dcfce7', icon: <CheckCircle2 size={11} /> },
    late: { label: 'Atrasado', color: '#b45309', bg: '#fef3c7', icon: <AlertTriangle size={11} /> },
    pending: { label: 'Sin reportes', color: '#6b7280', bg: '#f3f4f6', icon: null },
  }[status];
  return (
    <span
      style={{
        background: config.bg,
        color: config.color,
        fontSize: 11,
        fontWeight: 600,
        padding: '3px 8px',
        borderRadius: 6,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
