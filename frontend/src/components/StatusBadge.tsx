import type { EstimationStatus } from '../types';

const config: Record<EstimationStatus, { label: string; className: string }> = {
  POR_INGRESAR: { label: 'Por ingresar', className: 'bg-gray-100 text-gray-600' },
  INGRESADA:    { label: 'Ingresada',    className: 'bg-blue-100 text-blue-700' },
  EN_REVISION:  { label: 'En revisión',  className: 'bg-yellow-100 text-yellow-700' },
  APROBADA:     { label: 'Aprobada',     className: 'bg-purple-100 text-purple-700' },
  PAGADA:       { label: 'Pagada',       className: 'bg-green-100 text-green-700' },
};

export function StatusBadge({ status }: { status: EstimationStatus }) {
  const { label, className } = config[status] ?? config.POR_INGRESAR;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
