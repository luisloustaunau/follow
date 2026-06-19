import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProject, getFronts } from '../lib/api';
import type { Project, Front } from '../types';
import { ChevronRight, MapPin, Plus, Building2 } from 'lucide-react';
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
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to="/" className="hover:text-gray-700 transition-colors">Proyectos</Link>
        <ChevronRight size={14} />
        <span className="text-gray-700 font-medium">{project.name}</span>
      </div>

      {/* Header card */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex items-start gap-4 mb-6">
          <div className="bg-red-800 p-3 rounded-xl shrink-0">
            <Building2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-snug">{project.name}</h1>
            <p className="text-sm text-gray-400 font-mono mt-0.5">{project.contractNo}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Contratista', value: project.contractor },
            { label: 'Importe con IVA', value: fmt(project.amountWithIVA), highlight: 'text-green-700' },
            { label: 'Duración', value: `${project.durationDays} días naturales` },
            { label: 'Anticipo', value: project.advance && project.advance > 0 ? fmt(project.advance) : 'No hubo' },
            { label: 'Inicio', value: project.startDate },
            { label: 'Término', value: project.endDate },
          ].map((item) => (
            <div key={item.label} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">{item.label}</p>
              <p className={`text-sm font-semibold ${item.highlight ?? 'text-gray-800'}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="flex gap-3 mb-6">
        <Link
          to={`/projects/${projectId}/estimations`}
          className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 hover:border-red-800 hover:text-red-800 transition-all shadow-sm"
        >
          Ver estimaciones →
        </Link>
      </div>

      {/* Fronts */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-900">Frentes de trabajo</h2>
        {user?.role === 'owner' && (
          <Link
            to={`/projects/${projectId}/fronts/new`}
            className="flex items-center gap-1.5 text-sm font-medium text-red-800 hover:underline"
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
            className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2.5 rounded-xl">
                <MapPin size={15} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900">{f.name}</p>
                {f.location && <p className="text-xs text-gray-400 mt-0.5">{f.location}</p>}
              </div>
            </div>
            <ChevronRight size={15} className="text-gray-200 group-hover:text-red-800 transition-colors" />
          </Link>
        ))}
        {fronts.length === 0 && (
          <div className="col-span-2 flex flex-col items-center py-12 text-center bg-white rounded-2xl border border-gray-100">
            <MapPin size={24} className="text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">Sin frentes registrados</p>
          </div>
        )}
      </div>
    </div>
  );
}
