import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createReport, getSchedule, getReports } from '../lib/api';
import type { ScheduleRow, WeeklyReport } from '../types';
import { PhotoUploader } from '../components/PhotoUploader';
import { ChevronRight } from 'lucide-react';

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(n);
}

/**
 * Simplified weekly report form — supervisor only enters:
 *   - reportDate (defaults to next pending week)
 *   - parcial físico ($ this week)
 *   - parcial financiero ($ this week)
 *   - description / observations
 *   - photos
 *
 * Everything else (weekNo, acumulados, %s, programado) is computed
 * server-side on POST.
 */
export function NewReport() {
  const { projectId, frontId } = useParams<{
    projectId: string;
    frontId: string;
  }>();
  const navigate = useNavigate();

  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [existingReports, setExistingReports] = useState<WeeklyReport[]>([]);
  const [loadingCtx, setLoadingCtx] = useState(true);

  const [reportDate, setReportDate] = useState('');
  const [parcialFisico, setParcialFisico] = useState('');
  const [parcialFinanciero, setParcialFinanciero] = useState('');
  const [description, setDescription] = useState('');
  const [observations, setObservations] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!frontId) return;
    Promise.all([getSchedule(frontId), getReports(frontId)])
      .then(([s, r]) => {
        const sorted = [...s].sort((a, b) => a.weekNo - b.weekNo);
        setSchedule(sorted);
        setExistingReports(r);
        const reportedDates = new Set(r.map((rep) => rep.reportDate));
        const next = sorted.find(
          (row) => row.weekNo > 0 && !reportedDates.has(row.fechaCorte)
        );
        setReportDate(next?.fechaCorte ?? sorted[1]?.fechaCorte ?? '');
      })
      .finally(() => setLoadingCtx(false));
  }, [frontId]);

  const schedRow = useMemo(
    () => schedule.find((r) => r.fechaCorte === reportDate),
    [schedule, reportDate]
  );

  const previous = useMemo(() => {
    if (!schedRow) return null;
    return existingReports
      .filter((r) => r.weekNo < schedRow.weekNo)
      .sort((a, b) => b.weekNo - a.weekNo)[0];
  }, [existingReports, schedRow]);

  const prevFisico = Number(previous?.avanceFisicoRealAcum ?? 0);
  const prevFinanciero = Number(previous?.avanceFinancieroRealAcum ?? 0);
  const acumFisico = prevFisico + (Number(parcialFisico) || 0);
  const acumFinanciero = prevFinanciero + (Number(parcialFinanciero) || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!frontId) return;
    if (!reportDate) {
      setError('Selecciona la fecha de corte');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createReport(frontId, {
        reportDate,
        parcialFisico: Number(parcialFisico) || 0,
        parcialFinanciero: Number(parcialFinanciero) || 0,
        description,
        observations,
        photos,
      });
      navigate(`/projects/${projectId}/fronts/${frontId}`);
    } catch {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to="/" className="hover:text-gray-700">Proyectos</Link>
        <ChevronRight size={14} />
        <Link to={`/projects/${projectId}`} className="hover:text-gray-700">Proyecto</Link>
        <ChevronRight size={14} />
        <Link to={`/projects/${projectId}/fronts/${frontId}`} className="hover:text-gray-700">Frente</Link>
        <ChevronRight size={14} />
        <span className="text-gray-800 font-medium">Nuevo reporte</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Reporte semanal</h1>
      <p className="text-sm text-gray-500 mb-6">
        Solo registra el avance de <strong>esta semana</strong>. El resto se
        calcula automáticamente.
      </p>

      {loadingCtx ? (
        <p className="text-sm text-gray-400">Cargando…</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>
          <div className="card">
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Fecha de corte (semana)</label>
              <select
                className="input"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              >
                <option value="">— elegir semana —</option>
                {schedule
                  .filter((r) => r.weekNo > 0)
                  .map((r) => {
                    const reported = existingReports.find(
                      (rep) => rep.reportDate === r.fechaCorte
                    );
                    return (
                      <option key={r.weekNo} value={r.fechaCorte}>
                        Semana {r.weekNo} — {r.fechaCorte}
                        {reported ? '  (ya reportada)' : ''}
                      </option>
                    );
                  })}
              </select>
            </div>
            {schedRow && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 12,
                  marginTop: 8,
                }}
              >
                <KV label="Semana" value={String(schedRow.weekNo)} hint="" />
                <KV label="Programado esta semana" value={fmt(schedRow.progParcial)} hint="" />
                <KV
                  label="Programado acumulado"
                  value={fmt(schedRow.progAcumulado)}
                  hint={`${schedRow.progAcumuladoPct.toFixed(2)}%`}
                />
              </div>
            )}
          </div>

          <div className="card">
            <div className="section-bar" style={{ margin: '-1.5rem -1.5rem 1rem -1.5rem' }}>
              AVANCE REAL DE ESTA SEMANA
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
              }}
            >
              <div className="field">
                <label>Avance Físico parcial ($)</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={parcialFisico}
                  onChange={(e) => setParcialFisico(e.target.value)}
                />
                <p className="text-xs text-gray-500" style={{ marginTop: 4 }}>
                  Anterior acumulado: <strong>{fmt(prevFisico)}</strong> · Nuevo acumulado: <strong>{fmt(acumFisico)}</strong>
                </p>
              </div>
              <div className="field">
                <label>Avance Financiero parcial ($)</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={parcialFinanciero}
                  onChange={(e) => setParcialFinanciero(e.target.value)}
                />
                <p className="text-xs text-gray-500" style={{ marginTop: 4 }}>
                  Anterior acumulado: <strong>{fmt(prevFinanciero)}</strong> · Nuevo acumulado: <strong>{fmt(acumFinanciero)}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Descripción de trabajos</label>
              <textarea
                className="input"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe las actividades realizadas esta semana…"
              />
            </div>
            <div className="field">
              <label>Observaciones</label>
              <textarea
                className="input"
                rows={3}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Observaciones, retrasos, incidencias…"
              />
            </div>
          </div>

          <div className="card">
            <div className="field" style={{ marginBottom: 8 }}>
              <label>Reporte fotográfico</label>
            </div>
            {frontId && <PhotoUploader frontId={frontId} onChange={setPhotos} />}
          </div>

          {error && (
            <p
              style={{
                color: '#b91c1c',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                padding: 12,
                borderRadius: 8,
                fontSize: 14,
              }}
            >
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: 12, paddingBottom: 32 }}>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Guardando…' : 'Guardar reporte'}
            </button>
            <Link to={`/projects/${projectId}/fronts/${frontId}`} className="btn-secondary">
              Cancelar
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

function KV({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div
      style={{
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '8px 12px',
      }}
    >
      <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{value}</p>
      {hint && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{hint}</p>}
    </div>
  );
}
