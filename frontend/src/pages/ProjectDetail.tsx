import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProject, getFronts } from '../lib/api';
import type { Project, Front } from '../types';
import { ChevronRight, MapPin, Plus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
}

export function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [fronts, setFronts] = useState<Front[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!projectId) return;
    Promise.all([getProject(projectId), getFronts(projectId)])
      .then(([p, f]) => { setProject(p); setFronts(f); })
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="text-gray-400 text-sm">Cargando...</div>;
  if (!project) return <div className="text-red-500 text-sm">Proyecto no encontrado.</div>;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link to="/" className="hover:text-gray-600">Proyectos</Link>
        <ChevronRight size={14} />
        <span className="text-gray-700">{project.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h1 className="font-bold text-gray-900 text-lg mb-4">{project.name}</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-400 text-xs">No. Contrato</p>
            <p className="font-medium">{project.contractNo}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Contratista</p>
            <p className="font-medium">{project.contractor}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Importe con IVA</p>
            <p className="font-medium text-green-700">{fmt(project.amountWithIVA)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Duración</p>
            <p className="font-medium">{project.durationDays} días naturales</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Inicio</p>
            <p className="font-medium">{project.startDate}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Término</p>
            <p className="font-medium">{project.endDate}</p>
          </div>
          {project.advance !== undefined && (
            <div>
              <p className="text-gray-400 text-xs">Anticipo</p>
              <p className="font-medium">{project.advance > 0 ? fmt(project.advance) : 'No hubo'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-4 border-b border-gray-200">
        <Link
          to={`/projects/${projectId}/estimations`}
          className="pb-2 text-sm font-medium text-gray-500 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 transition-colors"
        >
          Estimaciones
        </Link>
      </div>

      {/* Fronts */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-800">Frentes de trabajo</h2>
        {user?.role === 'owner' && (
          <Link
            to={`/projects/${projectId}/fronts/new`}
            className="flex items-center gap-1 text-sm text-red-800 hover:underline"
          >
            <Plus size={14} />
            Agregar frente
          </Link>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {fronts.map((f) => (
          <Link
            key={f.id}
            to={`/projects/${projectId}/fronts/${f.id}`}
            className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-lg">
                <MapPin size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900">{f.name}</p>
                {f.location && <p className="text-xs text-gray-400">{f.location}</p>}
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
          </Link>
        ))}
        {fronts.length === 0 && (
          <p className="text-sm text-gray-400 col-span-2">Sin frentes registrados.</p>
        )}
      </div>
    </div>
  );
}
