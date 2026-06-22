import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getReports, getSchedule, getFronts, getProject } from '../lib/api';
import type { WeeklyReport, ScheduleRow, Front, Project } from '../types';
import { ProgressChart } from '../components/ProgressChart';
import { ScheduleEditor } from '../components/ScheduleEditor';
import {
  ChevronRight,
  Plus,
  Camera,
  AlertTriangle,
  FileText,
  CalendarRange,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { format, parseISO, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(n);
}

type Tab = 'reportes' | 'programa';

export function FrontDetail() {
  const { projectId, frontId } = useParams<{
    projectId: string;
    frontId: string;
  }>();
  const [project, setProject] = useState<Project | null>(null);
  const [front, setFront] = useState<Front | null>(null);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('reportes');
  const { user } = useAuth();

  useEffect(() => {
    if (!frontId || !projectId) return;
    Promise.all([
      getProject(projectId),
      getFronts(projectId),
      getReports(frontId),
      getSchedule(frontId),
    ])
      .then(([p, fs, r, s]) => {
        setProject(p);
        setFront(fs.find((f: Front) => f.id === frontId) ?? null);
        setReports(r);
        setSchedule(s);
      })
      .finally(() => setLoading(false));
  }, [frontId, projectId]);

  // Late warning: if today is > 7 days after the most recent report
  const today = new Date();
  const latestReport = [...reports].sort((a, b) => b.weekNo - a.weekNo)[0];
  const isLate = latestReport
    ? isAfter(
        today,
        new Date(new Date(latestReport.reportDate).getTime() + 8 * 86400000)
      )
    : schedule.length > 0;

  const canEdit = user?.role === 'owner' || user?.role === 'supervisor';

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link to="/" className="hover:text-gray-700">Proyectos</Link>
        <ChevronRight size={14} />
        <Link to={`/projects/${projectId}`} className="hover:text-gray-700">
          {project?.name?.slice(0, 40) ?? 'Proyecto'}
        </Link>
        <ChevronRight size={14} />
        <span className="text-gray-800 font-medium">{front?.name ?? 'Frente'}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{front?.name}</h1>
          {front?.location && (
            <p className="text-sm text-gray-500">{front.location}</p>
          )}
        </div>
        {tab === 'reportes' && canEdit && (
          <Link
            to={`/projects/${projectId}/fronts/${frontId}/reports/new`}
            className="btn-primary"
          >
            <Plus size={14} /> Nuevo reporte
          </Link>
        )}
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
          active={tab === 'reportes'}
          onClick={() => setTab('reportes')}
          icon={<FileText size={14} />}
          label="Reportes semanales"
        />
        <TabButton
          active={tab === 'programa'}
          onClick={() => setTab('programa')}
          icon={<CalendarRange size={14} />}
          label="Programa de obra"
        />
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Cargando…</p>
      ) : tab === 'programa' ? (
        frontId && <ScheduleEditor frontId={frontId} canEdit={user?.role === 'owner'} />
      ) : (
        <>
          {isLate && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#fffbeb',
                border: '1px solid #fcd34d',
                color: '#92400e',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              <AlertTriangle size={15} />
              {latestReport
                ? `Reporte pendiente — el último fue de la semana ${latestReport.weekNo} (${latestReport.reportDate}).`
                : 'Sin reportes aún — el primero está pendiente.'}
            </div>
          )}

          <div className="card" style={{ marginBottom: 20 }}>
            <h2 className="font-semibold text-gray-800 text-sm" style={{ marginBottom: 8 }}>
              Avance programado vs. real
            </h2>
            <ProgressChart schedule={schedule} reports={reports} />
          </div>

          <h2 className="font-semibold text-gray-800 mb-3">Reportes semanales</h2>
          {reports.length === 0 ? (
            <p className="text-sm text-gray-400">Sin reportes aún.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {[...reports]
                .sort((a, b) => b.weekNo - a.weekNo)
                .map((r) => (
                  <Link
                    key={r.id}
                    to={`/projects/${projectId}/fronts/${frontId}/reports/${r.id}`}
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
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = '#991b1b';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
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
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>
                          {format(parseISO(r.reportDate), "d 'de' MMMM yyyy", { locale: es })}
                        </p>
                        <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                          {r.description?.slice(0, 80) || 'Sin descripción'}
                          {r.description && r.description.length > 80 ? '…' : ''}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 13 }}>
                      {r.photos.length > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6b7280', fontSize: 12 }}>
                          <Camera size={13} /> {r.photos.length}
                        </span>
                      )}
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 11, color: '#9ca3af' }}>Avance acumulado</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>
                          {r.avanceFinancieroPct.toFixed(2)}%
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 11, color: '#9ca3af' }}>Programado</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#3b82f6' }}>
                          {fmt(r.progAcumScheduled)}
                        </p>
                      </div>
                      <ChevronRight size={15} className="text-gray-300" />
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </>
      )}
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
