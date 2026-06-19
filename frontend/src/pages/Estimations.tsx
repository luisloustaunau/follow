import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getEstimations, updateEstimation } from '../lib/api';
import type { Estimation, EstimationStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { ChevronRight, Save } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const STATUSES: EstimationStatus[] = [
  'POR_INGRESAR',
  'INGRESADA',
  'EN_REVISION',
  'APROBADA',
  'PAGADA',
];

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(n);
}

export function Estimations() {
  const { projectId } = useParams<{ projectId: string }>();
  const [estimations, setEstimations] = useState<Estimation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Estimation>>({});
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!projectId) return;
    getEstimations(projectId)
      .then(setEstimations)
      .finally(() => setLoading(false));
  }, [projectId]);

  function startEdit(est: Estimation) {
    setEditId(est.id);
    setEditData({ status: est.status, invoiceNo: est.invoiceNo, paidDate: est.paidDate, submittedDate: est.submittedDate });
  }

  async function saveEdit(est: Estimation) {
    if (!projectId) return;
    setSaving(true);
    try {
      const updated = await updateEstimation(projectId, est.id, editData);
      setEstimations((prev) => prev.map((e) => (e.id === est.id ? updated : e)));
      setEditId(null);
    } finally {
      setSaving(false);
    }
  }

  const canEdit = user?.role === 'billing' || user?.role === 'owner';

  const totalProgramado = estimations.reduce((s, e) => s + e.amountWithIVA, 0);
  const totalPagado = estimations.filter((e) => e.status === 'PAGADA').reduce((s, e) => s + e.liquid, 0);

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to="/" className="hover:text-gray-700 transition-colors">Proyectos</Link>
        <ChevronRight size={14} />
        <Link to={`/projects/${projectId}`} className="hover:text-gray-700 transition-colors">Proyecto</Link>
        <ChevronRight size={14} />
        <span className="text-gray-700 font-medium">Estimaciones</span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total programado', value: fmt(totalProgramado), color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: 'Total cobrado', value: fmt(totalPagado), color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-100' },
          { label: 'Por cobrar', value: fmt(totalProgramado - totalPagado), color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-5`}>
            <p className="text-xs font-medium text-gray-500 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Cargando...</div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['No.', 'Periodo', 'Importe', 'Deducción', 'Con IVA', 'Líquido', 'Factura', 'Fecha pago', 'Status', canEdit ? 'Acción' : ''].filter(Boolean).map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3.5 bg-gray-50/50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {estimations.map((est) => (
                <tr key={est.id} className={`transition-colors ${editId === est.id ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'}`}>
                  <td className="px-4 py-3.5 font-semibold text-gray-700">{est.estimationNo}</td>
                  <td className="px-4 py-3.5 text-gray-600">{est.period}</td>
                  <td className="px-4 py-3.5 text-gray-700">{fmt(est.amount)}</td>
                  <td className="px-4 py-3.5 text-red-500">{est.deductions > 0 ? fmt(est.deductions) : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3.5 font-medium text-gray-800">{fmt(est.amountWithIVA)}</td>
                  <td className="px-4 py-3.5 font-semibold text-green-700">{fmt(est.liquid)}</td>

                  <td className="px-4 py-3.5">
                    {editId === est.id ? (
                      <input
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs w-28 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                        value={editData.invoiceNo ?? ''}
                        onChange={(e) => setEditData((d) => ({ ...d, invoiceNo: e.target.value }))}
                        placeholder="No. factura"
                      />
                    ) : (
                      <span className="text-gray-600 font-mono text-xs">{est.invoiceNo || <span className="text-gray-300">—</span>}</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5">
                    {editId === est.id ? (
                      <input
                        type="date"
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                        value={editData.paidDate ?? ''}
                        onChange={(e) => setEditData((d) => ({ ...d, paidDate: e.target.value }))}
                      />
                    ) : (
                      <span className="text-gray-600 text-xs">{est.paidDate || <span className="text-gray-300">—</span>}</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5">
                    {editId === est.id ? (
                      <select
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                        value={editData.status}
                        onChange={(e) => setEditData((d) => ({ ...d, status: e.target.value as EstimationStatus }))}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <StatusBadge status={est.status} />
                    )}
                  </td>

                  {canEdit && (
                    <td className="px-4 py-3.5">
                      {editId === est.id ? (
                        <button
                          onClick={() => saveEdit(est)}
                          disabled={saving}
                          className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                        >
                          <Save size={11} />
                          {saving ? '...' : 'Guardar'}
                        </button>
                      ) : (
                        <button
                          onClick={() => startEdit(est)}
                          className="text-xs text-gray-400 hover:text-blue-600 font-medium transition-colors"
                        >
                          Editar
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
