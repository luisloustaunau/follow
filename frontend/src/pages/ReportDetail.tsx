import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  getReport,
  getReports,
  getReportPdfUrl,
  getViewUrl,
} from '../lib/api';
import type { WeeklyReport } from '../types';
import {
  ChevronRight,
  Download,
  Loader2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(n);
}

export function ReportDetail() {
  const { projectId, frontId, reportId } = useParams<{
    projectId: string;
    frontId: string;
    reportId: string;
  }>();
  const { user } = useAuth();
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!frontId || !reportId) return;
    // Some hosts dropped the singular endpoint — fall back to list-then-find
    (async () => {
      try {
        const r = await getReport(frontId, reportId);
        setReport(r);
      } catch {
        const all = await getReports(frontId);
        setReport(all.find((x) => x.id === reportId) ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, [frontId, reportId]);

  useEffect(() => {
    if (!report) return;
    report.photos.forEach(async (k) => {
      if (photoUrls[k]) return;
      try {
        const { url } = await getViewUrl(k);
        setPhotoUrls((p) => ({ ...p, [k]: url }));
      } catch {
        /* ignore */
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id]);

  async function downloadPdf() {
    if (!frontId || !reportId) return;
    setDownloading(true);
    try {
      const { url } = await getReportPdfUrl(frontId, reportId);
      window.open(url, '_blank');
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-400">Cargando…</p>;
  if (!report)
    return <p className="text-sm text-red-600">Reporte no encontrado.</p>;

  void user; // role-based edit hooks come later

  return (
    <div style={{ maxWidth: 960 }}>
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link to="/" className="hover:text-gray-700">Proyectos</Link>
        <ChevronRight size={14} />
        <Link to={`/projects/${projectId}`} className="hover:text-gray-700">
          Proyecto
        </Link>
        <ChevronRight size={14} />
        <Link
          to={`/projects/${projectId}/fronts/${frontId}`}
          className="hover:text-gray-700"
        >
          Frente
        </Link>
        <ChevronRight size={14} />
        <span className="text-gray-800 font-medium">
          Semana {report.weekNo}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Reporte semanal #{String(report.weekNo).padStart(3, '0')}
          </h1>
          <p className="text-sm text-gray-500">
            Fecha de corte:{' '}
            {format(parseISO(report.reportDate), "EEEE d 'de' MMMM yyyy", {
              locale: es,
            })}
            {report.submittedByName && (
              <>
                {' '}
                · Subido por <strong>{report.submittedByName}</strong>
              </>
            )}
          </p>
        </div>
        <button
          onClick={downloadPdf}
          disabled={downloading}
          className="btn-primary"
        >
          {downloading ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Generando…
            </>
          ) : (
            <>
              <Download size={14} /> Descargar PDF
            </>
          )}
        </button>
      </div>

      {/* AVANCES grid mirroring her Excel layout */}
      <div className="card" style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
        <div className="section-bar">AVANCES</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <AvanceBlock
            label="PROGRAMADO"
            amount={report.progAcumScheduled}
            pct={report.progPctScheduled}
          />
          <AvanceBlock
            label="FÍSICO"
            amount={report.avanceFisicoRealAcum}
            pct={report.avanceFisicoPct}
            highlight
          />
          <AvanceBlock
            label="FINANCIERO"
            amount={report.avanceFinancieroRealAcum}
            pct={report.avanceFinancieroPct}
            highlight
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div className="card">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wide">
            Descripción de trabajos
          </h3>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: '#1f2937', whiteSpace: 'pre-wrap' }}>
            {report.description || <span style={{ color: '#9ca3af' }}>Sin descripción.</span>}
          </p>
          {report.observations && (
            <>
              <h3
                className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
                style={{ marginTop: 16, marginBottom: 6 }}
              >
                Observaciones
              </h3>
              <p style={{ fontSize: 13, color: '#4b5563', whiteSpace: 'pre-wrap' }}>
                {report.observations}
              </p>
            </>
          )}
        </div>

        <div className="card">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wide">
            Reporte fotográfico ({report.photos.length})
          </h3>
          {report.photos.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9ca3af' }}>Sin fotografías.</p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: 8,
              }}
            >
              {report.photos.map((k) => (
                <a key={k} href={photoUrls[k]} target="_blank" rel="noreferrer">
                  {photoUrls[k] ? (
                    <img
                      src={photoUrls[k]}
                      alt=""
                      style={{
                        width: '100%',
                        height: 96,
                        objectFit: 'cover',
                        borderRadius: 6,
                        border: '1px solid #e5e7eb',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        height: 96,
                        background: '#f3f4f6',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#9ca3af',
                        fontSize: 11,
                      }}
                    >
                      cargando…
                    </div>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Detalle de avances (semana {report.weekNo})
        </h3>
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th style={{ textAlign: 'right' }}>Parcial</th>
              <th style={{ textAlign: 'right' }}>Acumulado</th>
              <th style={{ textAlign: 'right' }}>%</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 600 }}>Programado</td>
              <td style={{ textAlign: 'right' }}>{fmt(report.progParcialScheduled)}</td>
              <td style={{ textAlign: 'right' }}>{fmt(report.progAcumScheduled)}</td>
              <td style={{ textAlign: 'right' }}>{report.progPctScheduled.toFixed(4)}%</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600 }}>Físico real</td>
              <td style={{ textAlign: 'right' }}>{fmt(report.avanceFisicoReal)}</td>
              <td style={{ textAlign: 'right' }}>{fmt(report.avanceFisicoRealAcum)}</td>
              <td style={{ textAlign: 'right' }}>{report.avanceFisicoPct.toFixed(4)}%</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600 }}>Financiero real</td>
              <td style={{ textAlign: 'right' }}>{fmt(report.avanceFinancieroReal)}</td>
              <td style={{ textAlign: 'right' }}>{fmt(report.avanceFinancieroRealAcum)}</td>
              <td style={{ textAlign: 'right' }}>{report.avanceFinancieroPct.toFixed(4)}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AvanceBlock({
  label,
  amount,
  pct,
  highlight,
}: {
  label: string;
  amount: number;
  pct: number;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        borderRight: '1px solid #e5e7eb',
        padding: '14px 18px',
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: '#6b7280' }}>
        {label}
      </p>
      <p
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: highlight ? '#16a34a' : '#1f2937',
          marginTop: 4,
        }}
      >
        {fmt(amount)}
      </p>
      <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
        {pct.toFixed(4)}%
      </p>
    </div>
  );
}
