import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProjects, updateProjectStatus } from '../lib/api';
import type { Project, ProjectStatus } from '../types';
import { Building2, ChevronRight, Plus, Search } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
}

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; bg: string; dot: string }> = {
  PLANEACION:  { label: 'Planeación',  color: '#7c3aed', bg: '#f5f3ff', dot: '#7c3aed' },
  EN_PROGRESO: { label: 'En progreso', color: '#0369a1', bg: '#eff6ff', dot: '#0ea5e9' },
  PAUSADO:     { label: 'Pausado',     color: '#b45309', bg: '#fffbeb', dot: '#f59e0b' },
  COMPLETADO:  { label: 'Completado',  color: '#15803d', bg: '#f0fdf4', dot: '#22c55e' },
};

const ALL_STATUSES: ProjectStatus[] = ['PLANEACION', 'EN_PROGRESO', 'PAUSADO', 'COMPLETADO'];

function StatusBadge({ status }: { status?: ProjectStatus }) {
  const cfg = STATUS_CONFIG[status ?? 'EN_PROGRESO'];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 600, padding: '2px 8px',
      borderRadius: 999, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
      {cfg.label}
    </span>
  );
}

export function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'TODOS'>('TODOS');
  const { user } = useAuth();

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  async function handleStatusChange(e: React.MouseEvent, p: Project, newStatus: ProjectStatus) {
    e.preventDefault();
    e.stopPropagation();
    setProjects((prev) => prev.map((x) => x.id === p.id ? { ...x, status: newStatus } : x));
    await updateProjectStatus(p.id, newStatus).catch(() => {
      // revert on failure
      setProjects((prev) => prev.map((x) => x.id === p.id ? { ...x, status: p.status } : x));
    });
  }

  const filtered = projects.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.contractor.toLowerCase().includes(q) || p.contractNo.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'TODOS' || (p.status ?? 'EN_PROGRESO') === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proyectos</h1>
          <p className="text-sm text-gray-400 mt-0.5">{projects.length} contrato{projects.length !== 1 ? 's' : ''} activo{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === 'owner' && (
            <Link
              to="/users"
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-semibold hover:border-red-800 hover:text-red-800 transition-all shadow-sm"
            >
              Usuarios
            </Link>
          )}
          {user?.role === 'owner' && (
            <Link
              to="/projects/new"
              className="flex items-center gap-2 bg-red-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 transition-all shadow-sm shadow-red-800/20 active:scale-[0.98]"
            >
              <Plus size={15} />
              Nuevo proyecto
            </Link>
          )}
        </div>
      </div>

      {/* Search + filter bar */}
      {!loading && projects.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, contratista o contrato…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-red-800"
            />
          </div>
          <div className="flex gap-1.5">
            {(['TODOS', ...ALL_STATUSES] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  background: statusFilter === s ? (s === 'TODOS' ? '#1f2937' : STATUS_CONFIG[s].bg) : 'white',
                  color: statusFilter === s ? (s === 'TODOS' ? 'white' : STATUS_CONFIG[s].color) : '#6b7280',
                  border: `1px solid ${statusFilter === s ? 'transparent' : '#e5e7eb'}`,
                  padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {s === 'TODOS' ? 'Todos' : STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-6" />
              <div className="grid grid-cols-2 gap-2">
                {[...Array(4)].map((_, j) => <div key={j} className="h-8 bg-gray-100 rounded" />)}
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
            <Building2 size={28} className="text-red-800" />
          </div>
          <p className="text-gray-900 font-semibold">
            {projects.length === 0 ? 'Sin proyectos aún' : 'Sin resultados'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {projects.length === 0 ? 'Crea el primer proyecto para comenzar' : 'Intenta con otra búsqueda o filtro'}
          </p>
          {user?.role === 'owner' && projects.length === 0 && (
            <Link to="/projects/new" className="mt-4 text-sm text-red-800 font-medium hover:underline">
              + Nuevo proyecto
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const pct = p.avanceFisico ?? 0;
            const status = p.status ?? 'EN_PROGRESO';
            return (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:-translate-y-px transition-all group"
              >
                {/* Top row: name + status badge */}
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-red-800 p-2 rounded-lg shrink-0">
                      <Building2 size={15} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{p.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">{p.contractNo}</p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-red-800 transition-colors mt-0.5 shrink-0" />
                </div>

                {/* Status badge + dropdown (owner only) */}
                <div className="flex items-center gap-2 mb-3">
                  {user?.role === 'owner' ? (
                    <select
                      value={status}
                      onClick={(e) => e.preventDefault()}
                      onChange={(e) => handleStatusChange(e as unknown as React.MouseEvent, p, e.target.value as ProjectStatus)}
                      style={{
                        background: STATUS_CONFIG[status].bg,
                        color: STATUS_CONFIG[status].color,
                        border: 'none', borderRadius: 999,
                        fontSize: 11, fontWeight: 600,
                        padding: '2px 8px', cursor: 'pointer',
                      }}
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                      ))}
                    </select>
                  ) : (
                    <StatusBadge status={status} />
                  )}
                </div>

                {/* Contractor */}
                <div className="bg-gray-50 rounded-lg p-2.5 mb-3 border border-gray-100">
                  <p className="text-xs text-gray-400 mb-0.5">Contratista</p>
                  <p className="text-sm font-medium text-gray-700 truncate">{p.contractor}</p>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Avance físico</span>
                    <span className="font-semibold" style={{ color: pct >= 100 ? '#15803d' : pct > 0 ? '#0369a1' : '#9ca3af' }}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ height: 5, background: '#f3f4f6', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 999,
                      width: `${Math.min(pct, 100)}%`,
                      background: pct >= 100 ? '#22c55e' : pct > 0 ? '#0ea5e9' : '#e5e7eb',
                      transition: 'width 0.4s',
                    }} />
                  </div>
                </div>

                {/* Dates + amount */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-400">Importe c/IVA</p>
                    <p className="font-semibold text-green-700 mt-0.5">{fmt(p.amountWithIVA)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Duración</p>
                    <p className="font-semibold text-gray-700 mt-0.5">{p.durationDays} días</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Inicio</p>
                    <p className="font-medium text-gray-600 mt-0.5">{p.startDate}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Término</p>
                    <p className="font-medium text-gray-600 mt-0.5">{p.endDate}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
