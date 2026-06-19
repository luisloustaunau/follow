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
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link to="/" className="hover:text-gray-600">Proyectos</Link>
        <ChevronRight size={14} />
        <Link to={`/projects/${projectId}`} className="hover:text-gray-600">Proyecto</Link>
        <ChevronRight size={14} />
        <span className="text-gray-700">Estimaciones</span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total programado', value: fmt(totalProgramado), color: 'text-blue-700' },
          { label: 'Total cobrado', value: fmt(totalPagado), color: 'text-green-700' },
          { label: 'Por cobrar', value: fmt(totalProgramado - totalPagado), color: 'text-amber-700' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className={`text-lg font-bold ${s.color} mt-1`}>{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Cargando...</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['No.', 'Periodo', 'Importe', 'Deducción', 'Con IVA', 'Líquido', 'Factura', 'Fecha pago', 'Status', canEdit ? 'Acción' : ''].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {estimations.map((est) => (
                <tr key={est.id} className={editId === est.id ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-3 font-medium text-gray-700">{est.estimationNo}</td>
                  <td className="px-4 py-3 text-gray-600">{est.period}</td>
                  <td className="px-4 py-3 text-gray-700">{fmt(est.amount)}</td>
                  <td className="px-4 py-3 text-red-600">{est.deductions > 0 ? fmt(est.deductions) : '—'}</td>
                  <td className="px-4 py-3 font-medium">{fmt(est.amountWithIVA)}</td>
                  <td className="px-4 py-3 text-green-700 font-medium">{fmt(est.liquid)}</td>

                  {/* Editable: Factura */}
                  <td className="px-4 py-3">
                    {editId === est.id ? (
                      <input
                        className="border border-gray-300 rounded px-2 py-1 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={editData.invoiceNo ?? ''}
                        onChange={(e) => setEditData((d) => ({ ...d, invoiceNo: e.target.value }))}
                        placeholder="No. factura"
                      />
                    ) : (
                      <span className="text-gray-600">{est.invoiceNo || '—'}</span>
                    )}
                  </td>

                  {/* Editable: Fecha pago */}
                  <td className="px-4 py-3">
                    {editId === est.id ? (
                      <input
                        type="date"
                        className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={editData.paidDate ?? ''}
                        onChange={(e) => setEditData((d) => ({ ...d, paidDate: e.target.value }))}
                      />
                    ) : (
                      <span className="text-gray-600">{est.paidDate || '—'}</span>
                    )}
                  </td>

                  {/* Editable: Status */}
                  <td className="px-4 py-3">
                    {editId === est.id ? (
                      <select
                        className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                    <td className="px-4 py-3">
                      {editId === est.id ? (
                        <button
                          onClick={() => saveEdit(est)}
                          disabled={saving}
                          className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          <Save size={12} />
                          {saving ? '...' : 'Guardar'}
                        </button>
                      ) : (
                        <button
                          onClick={() => startEdit(est)}
                          className="text-xs text-blue-600 hover:underline"
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
