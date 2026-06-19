import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createReport } from '../lib/api';
import { ChevronRight, Upload, X } from 'lucide-react';

export function NewReport() {
  const { projectId, frontId } = useParams<{ projectId: string; frontId: string }>();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    reportDate: '',
    weekNo: '',
    progParcialScheduled: '',
    progAcumScheduled: '',
    progPctScheduled: '',
    avanceFisicoReal: '',
    avanceFisicoRealAcum: '',
    avanceFisicoPct: '',
    avanceFinancieroReal: '',
    avanceFinancieroRealAcum: '',
    avanceFinancieroPct: '',
    description: '',
    observations: '',
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) setPhotos(Array.from(e.target.files));
  }

  function removePhoto(i: number) {
    setPhotos((p) => p.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!frontId) return;
    setSaving(true);
    setError('');
    try {
      // TODO: upload photos to S3 via presigned URL, then attach URLs
      const payload = {
        ...form,
        weekNo: Number(form.weekNo),
        progParcialScheduled: Number(form.progParcialScheduled),
        progAcumScheduled: Number(form.progAcumScheduled),
        progPctScheduled: Number(form.progPctScheduled),
        avanceFisicoReal: Number(form.avanceFisicoReal),
        avanceFisicoRealAcum: Number(form.avanceFisicoRealAcum),
        avanceFisicoPct: Number(form.avanceFisicoPct),
        avanceFinancieroReal: Number(form.avanceFinancieroReal),
        avanceFinancieroRealAcum: Number(form.avanceFinancieroRealAcum),
        avanceFinancieroPct: Number(form.avanceFinancieroPct),
        photos: [],
      };
      await createReport(frontId, payload);
      navigate(`/projects/${projectId}/fronts/${frontId}`);
    } catch {
      setError('Error al guardar el reporte. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to="/" className="hover:text-gray-600">Proyectos</Link>
        <ChevronRight size={14} />
        <Link to={`/projects/${projectId}`} className="hover:text-gray-600">Proyecto</Link>
        <ChevronRight size={14} />
        <Link to={`/projects/${projectId}/fronts/${frontId}`} className="hover:text-gray-600">Frente</Link>
        <ChevronRight size={14} />
        <span className="text-gray-700">Nuevo reporte</span>
      </div>

      <h1 className="text-xl font-bold text-gray-900 mb-6">Reporte semanal</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm">Información general</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de corte</label>
              <input type="date" name="reportDate" value={form.reportDate} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-800" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">No. semana</label>
              <input type="number" name="weekNo" value={form.weekNo} onChange={handleChange} required min={0}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-800" />
            </div>
          </div>
        </div>

        {/* Programado */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm">Avance programado</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Parcial ($)', name: 'progParcialScheduled' },
              { label: 'Acumulado ($)', name: 'progAcumScheduled' },
              { label: '% Acumulado', name: 'progPctScheduled' },
            ].map((f) => (
              <div key={f.name}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                <input type="number" name={f.name} step="0.01" value={(form as never)[f.name]} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-800" />
              </div>
            ))}
          </div>
        </div>

        {/* Real físico */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm">Avance real — Físico</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Parcial ($)', name: 'avanceFisicoReal' },
              { label: 'Acumulado ($)', name: 'avanceFisicoRealAcum' },
              { label: '% Acumulado', name: 'avanceFisicoPct' },
            ].map((f) => (
              <div key={f.name}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                <input type="number" name={f.name} step="0.01" value={(form as never)[f.name]} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-800" />
              </div>
            ))}
          </div>
        </div>

        {/* Real financiero */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm">Avance real — Financiero</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Parcial ($)', name: 'avanceFinancieroReal' },
              { label: 'Acumulado ($)', name: 'avanceFinancieroRealAcum' },
              { label: '% Acumulado', name: 'avanceFinancieroPct' },
            ].map((f) => (
              <div key={f.name}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                <input type="number" name={f.name} step="0.01" value={(form as never)[f.name]} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-800" />
              </div>
            ))}
          </div>
        </div>

        {/* Descripción & Observaciones */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm">Descripción y observaciones</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción de trabajos</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-800 resize-none"
              placeholder="Describe las actividades realizadas esta semana..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
            <textarea name="observations" value={form.observations} onChange={handleChange} rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-800 resize-none"
              placeholder="Observaciones relevantes..." />
          </div>
        </div>

        {/* Fotos */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-gray-800 text-sm">Reporte fotográfico</h2>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-red-800 hover:underline">
            <Upload size={15} />
            Seleccionar fotos
            <input type="file" multiple accept="image/*" onChange={handlePhotos} className="hidden" />
          </label>
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((f, i) => (
                <div key={i} className="relative group">
                  <img src={URL.createObjectURL(f)} alt="" className="w-full h-24 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-red-800 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar reporte'}
          </button>
          <Link
            to={`/projects/${projectId}/fronts/${frontId}`}
            className="px-6 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
