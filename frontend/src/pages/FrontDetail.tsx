import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getReports } from '../lib/api';
import type { WeeklyReport, ScheduleRow } from '../types';
import { ProgressChart } from '../components/ProgressChart';
import { ChevronRight, Plus, Camera, AlertTriangle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { format, parseISO, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';

// Placeholder schedule — in production this comes from the API
const MOCK_SCHEDULE: ScheduleRow[] = [];

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
}

export function FrontDetail() {
  const { projectId, frontId } = useParams<{ projectId: string; frontId: string }>();
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!frontId) return;
    getReports(frontId)
      .then(setReports)
      .finally(() => setLoading(false));
  }, [frontId]);

  const today = new Date();
  // Last expected report date (last Monday before or on today)
  const latestReport = reports[reports.length - 1];
  const isLate = latestReport
    ? isAfter(today, new Date(new Date(latestReport.reportDate).getTime() + 7 * 86400000))
    : false;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link to="/" className="hover:text-gray-600">Proyectos</Link>
        <ChevronRight size={14} />
        <Link to={`/projects/${projectId}`} className="hover:text-gray-600">Proyecto</Link>
        <ChevronRight size={14} />
        <span className="text-gray-700">Frente</span>
      </div>

      {/* Late warning */}
      {isLate && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-2 text-sm mb-4">
          <AlertTriangle size={15} />
          Reporte semanal pendiente — no se ha subido el reporte de esta semana.
        </div>
      )}

      {/* Chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-gray-800 text-sm mb-4">
          Avance programado vs. real
        </h2>
        {MOCK_SCHEDULE.length > 0 ? (
          <ProgressChart schedule={MOCK_SCHEDULE} reports={reports} />
        ) : (
          <p className="text-xs text-gray-400">Cargando programa de obra...</p>
        )}
      </div>

      {/* Reports list */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-800">Reportes semanales</h2>
        {(user?.role === 'supervisor' || user?.role === 'owner') && (
          <Link
            to={`/projects/${projectId}/fronts/${frontId}/reports/new`}
            className="flex items-center gap-1.5 bg-red-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <Plus size={14} />
            Nuevo reporte
          </Link>
        )}
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Cargando...</div>
      ) : (
        <div className="space-y-3">
          {[...reports].reverse().map((r) => (
            <Link
              key={r.id}
              to={`/projects/${projectId}/fronts/${frontId}/reports/${r.id}`}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-gray-50 rounded-lg p-2 text-center min-w-12">
                  <p className="text-xs text-gray-400">Sem</p>
                  <p className="font-bold text-gray-900">{r.weekNo}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {format(parseISO(r.reportDate), "d 'de' MMMM yyyy", { locale: es })}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{r.description || 'Sin descripción'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                {r.photos.length > 0 && (
                  <span className="flex items-center gap-1 text-gray-400 text-xs">
                    <Camera size={13} />
                    {r.photos.length}
                  </span>
                )}
                <div className="text-right">
                  <p className="text-xs text-gray-400">Avance acum.</p>
                  <p className="font-semibold text-green-700">{r.avanceFisicoPct.toFixed(2)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Programado</p>
                  <p className="font-semibold text-blue-600">{fmt(r.progAcumScheduled)}</p>
                </div>
                <ChevronRight size={15} className="text-gray-300 group-hover:text-gray-500" />
              </div>
            </Link>
          ))}
          {reports.length === 0 && (
            <p className="text-sm text-gray-400">Sin reportes aún.</p>
          )}
        </div>
      )}
    </div>
  );
}
