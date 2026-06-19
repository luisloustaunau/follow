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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Proyectos</h1>
          <p className="text-sm text-gray-500">{projects.length} contratos activos</p>
        </div>
        {user?.role === 'owner' && (
          <Link
            to="/projects/new"
            className="flex items-center gap-1.5 bg-red-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <Plus size={15} />
            Nuevo proyecto
          </Link>
        )}
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Cargando...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-red-50 p-2 rounded-lg">
                    <Building2 size={18} className="text-red-800" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm leading-snug">{p.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.contractNo}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors mt-1" />
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-400">Contratista</p>
                  <p className="text-gray-700 font-medium truncate">{p.contractor}</p>
                </div>
                <div>
                  <p className="text-gray-400">Importe c/IVA</p>
                  <p className="text-gray-700 font-medium">{fmt(p.amountWithIVA)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Inicio</p>
                  <p className="text-gray-700">{p.startDate}</p>
                </div>
                <div>
                  <p className="text-gray-400">Término</p>
                  <p className="text-gray-700">{p.endDate}</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Avance programado</span>
                  <span className="text-blue-600 font-medium">—</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '0%' }} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
