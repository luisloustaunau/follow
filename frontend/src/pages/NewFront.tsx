import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { createFront } from '../lib/api';
import { ChevronRight } from 'lucide-react';

export function NewFront() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', location: '' });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setSaving(true);
    setError('');
    try {
      await createFront(projectId, form);
      navigate(`/projects/${projectId}`);
    } catch {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to="/" className="hover:text-gray-700 transition-colors">Proyectos</Link>
        <ChevronRight size={14} />
        <Link to={`/projects/${projectId}`} className="hover:text-gray-700 transition-colors">Proyecto</Link>
        <ChevronRight size={14} />
        <span className="text-gray-700 font-medium">Nuevo frente</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nuevo frente de trabajo</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre del frente</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Ej: Tramo Lagos de Moreno"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ubicación <span className="text-gray-400 font-normal">— opcional</span></label>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Ej: Lagos de Moreno, Jalisco"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition-all"
            />
          </div>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-red-800 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Crear frente'}
          </button>
          <Link
            to={`/projects/${projectId}`}
            className="px-6 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
