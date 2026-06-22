import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getAllEstimations } from '../lib/api';
import type { EnrichedEstimation } from '../lib/api';
import type { EstimationStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { ChevronRight, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(n);
}

const STATUSES: { label: string; value: EstimationStatus; color: string; bg: string }[] = [
  { label: 'Pagadas', value: 'PAGADA', color: '#15803d', bg: '#dcfce7' },
  { label: 'Pendientes pago', value: 'INGRESADA', color: '#9a3412', bg: '#ffedd5' },
  { label: 'En revisión', value: 'EN_REVISION', color: '#92400e', bg: '#fef3c7' },
  { label: 'Por ingresar', value: 'POR_INGRESAR', color: '#6b7280', bg: '#f3f4f6' },
];

type Filter = 'all' | EstimationStatus;

/**
 * Global "Estimaciones" view — consolidated billing dashboard across
 * every project. Built for the billing person + Regina:
 *  - Top: totals (programado / cobrado / por cobrar) + status counts
 *  - Middle: filterable table of every estimación (newest first),
 *    grouped visually by status with quick links to project detail.
 */
export function AllEstimations() {
  const [data, setData] = useState<{
    estimations: EnrichedEstimation[];
    projects: { id: string; name: string; contractNo: string; contractor: string; amountWithIVA: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    getAllEstimations()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const query = q.trim().toLowerCase();
    return data.estimations.filter((e) => {
      if (filter !== 'all' && e.status !== filter) return false;
      if (
        query &&
        !`${e.projectName} ${e.projectContractNo} ${e.estimationNo} ${e.invoiceNo ?? ''}`
          .toLowerCase()
          .includes(query)
      )
        return false;
      return true;
    });
  }, [data, filter, q]);

  const totals = useMemo(() => {
    if (!data)
      return { contracted: 0, billed: 0, paid: 0, pending: 0 };
    const contracted = data.projects.reduce((s, p) => s + (p.amountWithIVA ?? 0), 0);
    const billed = data.estimations.reduce((s, e) => s + (e.amountWithIVA ?? 0), 0);
    const paid = data.estimations
      .filter((e) => e.status === 'PAGADA')
      .reduce((s, e) => s + (e.liquid ?? 0), 0);
    const pending = data.estimations
      .filter((e) => e.status !== 'PAGADA' && e.status !== 'POR_INGRESAR')
      .reduce((s, e) => s + (e.liquid ?? 0), 0);
    return { contracted, billed, paid, pending };
  }, [data]);

  const statusCounts = useMemo(() => {
    if (!data) return new Map<EstimationStatus, number>();
    const map = new Map<EstimationStatus, number>();
    data.estimations.forEach((e) => {
      map.set(e.status, (map.get(e.status) ?? 0) + 1);
    });
    return map;
  }, [data]);

  if (loading) return <p className="text-sm text-gray-400">Cargando…</p>;
  if (!data) return <p className="text-sm text-red-600">Error al cargar.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900" style={{ marginBottom: 4 }}>
        Estimaciones
      </h1>
      <p className="text-sm text-gray-500" style={{ marginBottom: 20 }}>
        Seguimiento de pagos · {data.projects.length} contratos ·{' '}
        {data.estimations.length} estimaciones
      </p>

      {/* Money totals */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Money label="Total contratado" value={fmt(totals.contracted)} color="#1d4ed8" bg="#eff6ff" />
        <Money label="Total estimado" value={fmt(totals.billed)} color="#7c2d12" bg="#fff7ed" />
        <Money label="Cobrado" value={fmt(totals.paid)} color="#15803d" bg="#f0fdf4" />
        <Money label="Por cobrar" value={fmt(totals.pending)} color="#b45309" bg="#fefce8" />
      </div>

      {/* Status filter chips */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <Chip
          label="Todas"
          count={data.estimations.length}
          active={filter === 'all'}
          color="#374151"
          bg="#f3f4f6"
          onClick={() => setFilter('all')}
        />
        {STATUSES.map((s) => (
          <Chip
            key={s.value}
            label={s.label}
            count={statusCounts.get(s.value) ?? 0}
            active={filter === s.value}
            color={s.color}
            bg={s.bg}
            onClick={() => setFilter(filter === s.value ? 'all' : s.value)}
          />
        ))}
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
          placeholder="Buscar por obra, contrato, factura, no. estimación…"
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

      {/* Table */}
      <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Proyecto</th>
              <th>No.</th>
              <th>Período</th>
              <th style={{ textAlign: 'right' }}>Importe</th>
              <th style={{ textAlign: 'right' }}>Líquido</th>
              <th>Factura</th>
              <th>Fecha pago</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}
                >
                  Sin estimaciones con esos criterios
                </td>
              </tr>
            ) : (
              filtered.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link
                      to={`/projects/${e.projectId}/estimations`}
                      style={{ color: '#374151', textDecoration: 'none', fontWeight: 500 }}
                    >
                      {e.projectName}
                    </Link>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                      {e.projectContractNo}
                    </p>
                  </td>
                  <td style={{ fontWeight: 600 }}>{e.estimationNo}</td>
                  <td>{e.period}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(e.amountWithIVA)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#15803d' }}>
                    {fmt(e.liquid)}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {e.invoiceNo || <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {e.paidDate
                      ? format(parseISO(e.paidDate), 'd MMM yyyy', { locale: es })
                      : <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  <td>
                    <StatusBadge status={e.status} />
                  </td>
                  <td>
                    <Link
                      to={`/projects/${e.projectId}/estimations`}
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
    </div>
  );
}

function Money({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <div
      style={{
        background: bg,
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: '14px 18px',
      }}
    >
      <p style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 700, color, marginTop: 4 }}>{value}</p>
    </div>
  );
}

function Chip({
  label,
  count,
  active,
  color,
  bg,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  color: string;
  bg: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? color : bg,
        color: active ? 'white' : color,
        border: '1px solid ' + (active ? color : '#e5e7eb'),
        borderRadius: 999,
        padding: '6px 14px',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {label}
      <span
        style={{
          background: active ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)',
          padding: '1px 7px',
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        {count}
      </span>
    </button>
  );
}
