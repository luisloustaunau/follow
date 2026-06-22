import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getEstimations,
  getMonthlyProgram,
  createEstimation,
  updateEstimation,
  getEstimationsPdfUrl,
} from '../lib/api';
import type {
  Estimation,
  EstimationStatus,
  MonthProgramRow,
} from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { MonthlyProgramEditor } from '../components/MonthlyProgramEditor';
import {
  ChevronRight,
  Save,
  Plus,
  Download,
  Loader2,
  CalendarRange,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const STATUSES: EstimationStatus[] = [
  'POR_INGRESAR',
  'INGRESADA',
  'EN_REVISION',
  'APROBADA',
  'PAGADA',
];

const MONTH_LABEL_ES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(n);
}

type Tab = 'control' | 'programa';

export function Estimations() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('control');
  const [estimations, setEstimations] = useState<Estimation[]>([]);
  const [monthlyProgram, setMonthlyProgram] = useState<MonthProgramRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Estimation>>({});
  const [saving, setSaving] = useState(false);

  const [showNew, setShowNew] = useState(false);
  const [newEst, setNewEst] = useState({
    estimationNo: '',
    periodMonth: '',
    period: '',
    amount: '',
    deductions: '',
  });

  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([getEstimations(projectId), getMonthlyProgram(projectId)])
      .then(([e, m]) => {
        setEstimations(e);
        setMonthlyProgram([...m].sort((a, b) => a.month.localeCompare(b.month)));
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  const canEdit = user?.role === 'billing' || user?.role === 'owner';

  // Build planned vs actual by month
  const byMonth = new Map<string, { planned: number; actual: number; paid: number }>();
  monthlyProgram.forEach((m) =>
    byMonth.set(m.month, { planned: m.amount, actual: 0, paid: 0 })
  );
  estimations.forEach((e) => {
    const entry = byMonth.get(e.periodMonth) ?? {
      planned: 0,
      actual: 0,
      paid: 0,
    };
    entry.actual += e.amountWithIVA;
    if (e.status === 'PAGADA') entry.paid += e.liquid;
    byMonth.set(e.periodMonth, entry);
  });

  const totalProgramado = monthlyProgram.reduce((s, m) => s + m.amount, 0);
  const totalActual = estimations.reduce((s, e) => s + e.amountWithIVA, 0);
  const totalPagado = estimations
    .filter((e) => e.status === 'PAGADA')
    .reduce((s, e) => s + e.liquid, 0);

  function startEdit(est: Estimation) {
    setEditId(est.id);
    setEditData({
      status: est.status,
      invoiceNo: est.invoiceNo,
      paidDate: est.paidDate,
      submittedDate: est.submittedDate,
    });
  }
  async function saveEdit(est: Estimation) {
    if (!projectId) return;
    setSaving(true);
    try {
      const updated = await updateEstimation(projectId, est.id, editData);
      setEstimations((prev) =>
        prev.map((e) => (e.id === est.id ? { ...e, ...updated } : e))
      );
      setEditId(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    if (!projectId || !newEst.estimationNo || !newEst.periodMonth) return;
    const [year, monthIdx] = newEst.periodMonth.split('-').map(Number);
    const period = newEst.period || `${MONTH_LABEL_ES[monthIdx - 1]} ${year}`;
    setSaving(true);
    try {
      const created = await createEstimation(projectId, {
        estimationNo: newEst.estimationNo,
        periodMonth: newEst.periodMonth,
        period,
        amount: Number(newEst.amount) || 0,
        deductions: Number(newEst.deductions) || 0,
      });
      setEstimations((prev) => [...prev, created]);
      setNewEst({ estimationNo: '', periodMonth: '', period: '', amount: '', deductions: '' });
      setShowNew(false);
    } finally {
      setSaving(false);
    }
  }

  async function downloadPdf() {
    if (!projectId) return;
    setDownloading(true);
    try {
      const { url } = await getEstimationsPdfUrl(projectId);
      window.open(url, '_blank');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link to="/" className="hover:text-gray-700">Proyectos</Link>
        <ChevronRight size={14} />
        <Link to={`/projects/${projectId}`} className="hover:text-gray-700">
          Proyecto
        </Link>
        <ChevronRight size={14} />
        <span className="text-gray-800 font-medium">Estimaciones</span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <h1 className="text-2xl font-bold text-gray-900">Control de Estimaciones</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={downloadPdf} disabled={downloading} className="btn-secondary">
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {downloading ? 'Generando…' : 'Descargar PDF'}
          </button>
          {canEdit && tab === 'control' && (
            <button onClick={() => setShowNew(true)} className="btn-primary">
              <Plus size={14} /> Nueva estimación
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <SummaryCard label="Total programado" value={fmt(totalProgramado)} color="#1d4ed8" bg="#eff6ff" />
        <SummaryCard label="Total estimado (c/IVA)" value={fmt(totalActual)} color="#7c2d12" bg="#fff7ed" />
        <SummaryCard label="Total cobrado" value={fmt(totalPagado)} color="#15803d" bg="#f0fdf4" />
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          borderBottom: '1px solid #e5e7eb',
          marginBottom: 20,
        }}
      >
        <TabButton
          active={tab === 'control'}
          onClick={() => setTab('control')}
          icon={<DollarSign size={14} />}
          label="Estimaciones"
        />
        <TabButton
          active={tab === 'programa'}
          onClick={() => setTab('programa')}
          icon={<CalendarRange size={14} />}
          label="Programa mensual"
        />
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Cargando…</p>
      ) : tab === 'programa' ? (
        projectId && (
          <MonthlyProgramEditor
            projectId={projectId}
            canEdit={user?.role === 'owner'}
          />
        )
      ) : (
        <>
          {/* Planned vs actual by month */}
          {monthlyProgram.length > 0 && (
            <div className="card" style={{ marginBottom: 16, overflowX: 'auto' }}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Programado vs. real por mes
              </h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th style={{ textAlign: 'right' }}>Programado</th>
                    <th style={{ textAlign: 'right' }}>Estimado</th>
                    <th style={{ textAlign: 'right' }}>Pagado</th>
                    <th style={{ textAlign: 'right' }}>Avance</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyProgram.map((m) => {
                    const e = byMonth.get(m.month) ?? { planned: 0, actual: 0, paid: 0 };
                    const pct = m.amount > 0 ? (e.actual / m.amount) * 100 : 0;
                    return (
                      <tr key={m.month}>
                        <td style={{ fontWeight: 500 }}>{m.monthLabel}</td>
                        <td style={{ textAlign: 'right' }}>{fmt(m.amount)}</td>
                        <td style={{ textAlign: 'right' }}>{fmt(e.actual)}</td>
                        <td style={{ textAlign: 'right', color: '#15803d' }}>
                          {fmt(e.paid)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: pct >= 100 ? '#15803d' : '#6b7280' }}>
                          {pct.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Estimaciones table */}
          <div className="card" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Período</th>
                  <th style={{ textAlign: 'right' }}>Importe</th>
                  <th style={{ textAlign: 'right' }}>Deducción</th>
                  <th style={{ textAlign: 'right' }}>Con IVA</th>
                  <th style={{ textAlign: 'right' }}>Líquido</th>
                  <th>Factura</th>
                  <th>Fecha pago</th>
                  <th>Status</th>
                  {canEdit && <th></th>}
                </tr>
              </thead>
              <tbody>
                {estimations.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 10 : 9} style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>
                      Sin estimaciones aún
                    </td>
                  </tr>
                ) : (
                  [...estimations]
                    .sort((a, b) => a.estimationNo.localeCompare(b.estimationNo))
                    .map((est) => (
                      <tr key={est.id}>
                        <td style={{ fontWeight: 600 }}>{est.estimationNo}</td>
                        <td>{est.period}</td>
                        <td style={{ textAlign: 'right' }}>{fmt(est.amount)}</td>
                        <td style={{ textAlign: 'right', color: '#dc2626' }}>
                          {est.deductions > 0 ? fmt(est.deductions) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>
                          {fmt(est.amountWithIVA)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#15803d' }}>
                          {fmt(est.liquid)}
                        </td>
                        <td>
                          {editId === est.id ? (
                            <input
                              value={editData.invoiceNo ?? ''}
                              onChange={(e) =>
                                setEditData((d) => ({ ...d, invoiceNo: e.target.value }))
                              }
                              placeholder="No. factura"
                            />
                          ) : (
                            <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                              {est.invoiceNo || '—'}
                            </span>
                          )}
                        </td>
                        <td>
                          {editId === est.id ? (
                            <input
                              type="date"
                              value={editData.paidDate ?? ''}
                              onChange={(e) =>
                                setEditData((d) => ({ ...d, paidDate: e.target.value }))
                              }
                            />
                          ) : (
                            <span style={{ fontSize: 12 }}>{est.paidDate || '—'}</span>
                          )}
                        </td>
                        <td>
                          {editId === est.id ? (
                            <select
                              value={editData.status ?? est.status}
                              onChange={(e) =>
                                setEditData((d) => ({
                                  ...d,
                                  status: e.target.value as EstimationStatus,
                                }))
                              }
                            >
                              {STATUSES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          ) : (
                            <StatusBadge status={est.status} />
                          )}
                        </td>
                        {canEdit && (
                          <td>
                            {editId === est.id ? (
                              <button
                                onClick={() => saveEdit(est)}
                                disabled={saving}
                                className="btn-primary"
                                style={{ padding: '6px 10px', fontSize: 12 }}
                              >
                                <Save size={11} /> {saving ? '…' : 'Guardar'}
                              </button>
                            ) : (
                              <button
                                onClick={() => startEdit(est)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#6b7280',
                                  fontSize: 12,
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                }}
                              >
                                Editar
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* New estimation modal */}
      {showNew && (
        <div className="modal-backdrop" onClick={() => setShowNew(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-gray-900 mb-4">Nueva estimación</h3>
            <div style={{ display: 'grid', gap: 14 }}>
              <div className="field">
                <label>No. de estimación</label>
                <input
                  className="input"
                  value={newEst.estimationNo}
                  onChange={(e) => setNewEst((s) => ({ ...s, estimationNo: e.target.value }))}
                  placeholder="ESTIMACIÓN 01"
                />
              </div>
              <div className="field">
                <label>Mes (período)</label>
                <input
                  className="input"
                  type="month"
                  value={newEst.periodMonth}
                  onChange={(e) => setNewEst((s) => ({ ...s, periodMonth: e.target.value }))}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>Importe ($)</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={newEst.amount}
                    onChange={(e) => setNewEst((s) => ({ ...s, amount: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Deducciones inspección ($)</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={newEst.deductions}
                    onChange={(e) => setNewEst((s) => ({ ...s, deductions: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <button onClick={() => setShowNew(false)} className="btn-secondary">
                Cancelar
              </button>
              <button onClick={handleCreate} disabled={saving} className="btn-primary">
                {saving ? 'Guardando…' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
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
      <p style={{ fontSize: 20, fontWeight: 700, color, marginTop: 4 }}>{value}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid #991b1b' : '2px solid transparent',
        color: active ? '#991b1b' : '#6b7280',
        padding: '10px 16px',
        fontSize: 14,
        fontWeight: active ? 600 : 500,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: -1,
      }}
    >
      {icon} {label}
    </button>
  );
}
