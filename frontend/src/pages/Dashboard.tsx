import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProjects } from '../lib/api';
import type { Project } from '../types';
import { Building2, ChevronRight, Plus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
}

export function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proyectos</h1>
          <p className="text-sm text-gray-400 mt-0.5">{projects.length} contrato{projects.length !== 1 ? 's' : ''} activo{projects.length !== 1 ? 's' : ''}</p>
        </div>
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
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
            <Building2 size={28} className="text-red-800" />
          </div>
          <p className="text-gray-900 font-semibold">Sin proyectos aún</p>
          <p className="text-gray-400 text-sm mt-1">Crea el primer proyecto para comenzar</p>
          {user?.role === 'owner' && (
            <Link to="/projects/new" className="mt-4 text-sm text-red-800 font-medium hover:underline">
              + Nuevo proyecto
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:-translate-y-px transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-red-800 p-2 rounded-lg shrink-0">
                    <Building2 size={15} className="text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{p.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">{p.contractNo}</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-gray-300 group-hover:text-red-800 transition-colors mt-0.5 shrink-0" />
              </div>

              <div className="bg-gray-50 rounded-lg p-2.5 mb-3 border border-gray-100">
                <p className="text-xs text-gray-400 mb-0.5">Contratista</p>
                <p className="text-sm font-medium text-gray-700 truncate">{p.contractor}</p>
              </div>

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
          ))}
        </div>
      )}
    </div>
  );
}
