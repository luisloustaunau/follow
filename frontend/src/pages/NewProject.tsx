import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createProject } from '../lib/api';
import { ChevronRight } from 'lucide-react';

export function NewProject() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    contractNo: '',
    contractor: '',
    amountWithIVA: '',
    startDate: '',
    endDate: '',
    durationDays: '',
    advance: '',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const project = await createProject({
        ...form,
        amountWithIVA: Number(form.amountWithIVA),
        durationDays: Number(form.durationDays),
        advance: Number(form.advance ?? 0),
      });
      navigate(`/projects/${project.id}`);
    } catch {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to="/" className="hover:text-gray-700 transition-colors">Proyectos</Link>
        <ChevronRight size={14} />
        <span className="text-gray-700 font-medium">Nuevo proyecto</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nuevo proyecto</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Datos del contrato */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">Datos del contrato</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre / Descripción de la obra</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder='"Mantenimiento menor de la autopista Querétaro – Irapuato"'
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">No. Contrato</label>
              <input
                name="contractNo"
                value={form.contractNo}
                onChange={handleChange}
                required
                placeholder="LO-09-J0U-002-N-16-2026"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contratista</label>
              <input
                name="contractor"
                value={form.contractor}
                onChange={handleChange}
                required
                placeholder="XARIDU, S.A. DE C.V."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Montos */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">Montos</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Importe con IVA ($)</label>
              <input
                name="amountWithIVA"
                type="number"
                step="0.01"
                value={form.amountWithIVA}
                onChange={handleChange}
                required
                placeholder="18,013,518.78"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Anticipo ($) <span className="text-gray-400 font-normal">— opcional</span></label>
              <input
                name="advance"
                type="number"
                step="0.01"
                value={form.advance}
                onChange={handleChange}
                placeholder="0"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Programa de obra */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">Programa de obra</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha de inicio</label>
              <input
                name="startDate"
                type="date"
                value={form.startDate}
                onChange={handleChange}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha de término</label>
              <input
                name="endDate"
                type="date"
                value={form.endDate}
                onChange={handleChange}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Duración (días)</label>
              <input
                name="durationDays"
                type="number"
                value={form.durationDays}
                onChange={handleChange}
                required
                placeholder="343"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition-all"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
        )}

        <div className="flex gap-3 pb-8">
          <button
            type="submit"
            disabled={saving}
            className="bg-red-800 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Crear proyecto'}
          </button>
          <Link
            to="/"
            className="px-6 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
