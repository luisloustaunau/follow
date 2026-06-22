import { useEffect, useState } from 'react';
import { getSchedule, saveSchedule } from '../lib/api';
import type { ScheduleRow } from '../types';
import { Save, FileSpreadsheet, RotateCcw } from 'lucide-react';

interface Props {
  frontId: string;
  canEdit: boolean;
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(n);
}

/**
 * Programa de Obra editor — the contract baseline. Auto-seeded when the
 * Frente is created. User can edit any row inline OR paste the whole grid
 * from her Excel "Programa" sheet (Fecha Corte | Prog Parcial | Acumulado).
 */
export function ScheduleEditor({ frontId, canEdit }: Props) {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');

  useEffect(() => {
    setLoading(true);
    getSchedule(frontId)
      .then((r) => {
        setRows([...r].sort((a, b) => a.weekNo - b.weekNo));
        setDirty(false);
      })
      .finally(() => setLoading(false));
  }, [frontId]);

  function updateCell(i: number, field: keyof ScheduleRow, value: string) {
    setRows((rs) => {
      const next = [...rs];
      const row = { ...next[i] };
      if (field === 'fechaCorte') {
        row.fechaCorte = value;
      } else {
        (row[field] as number) = Number(value) || 0;
      }
      // If parcial changed, recompute acumulado from row 0
      next[i] = row;
      if (field === 'progParcial') recomputeAcumulados(next);
      return next;
    });
    setDirty(true);
  }

  function recomputeAcumulados(arr: ScheduleRow[]) {
    let acum = 0;
    arr.forEach((r) => {
      acum += r.progParcial || 0;
      r.progAcumulado = Number(acum.toFixed(2));
    });
    const total = arr[arr.length - 1]?.progAcumulado || 1;
    arr.forEach((r) => {
      r.progParcialPct = Number(((r.progParcial / total) * 100).toFixed(4));
      r.progAcumuladoPct = Number(((r.progAcumulado / total) * 100).toFixed(4));
    });
  }

  async function save() {
    setSaving(true);
    try {
      await saveSchedule(frontId, rows);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  function handlePaste() {
    // Accept TSV (Excel copy) or CSV. Each line: fecha\tparcial\tacum (acum optional)
    const lines = pasteText
      .trim()
      .split(/\r?\n/)
      .map((l) => l.split(/\t|,|;/).map((c) => c.trim()))
      .filter((c) => c.length >= 2);
    if (lines.length === 0) return;

    const parsed: ScheduleRow[] = lines.map((cells, i) => {
      // Auto-detect: if first cell looks like a date, format=[fecha, parcial, acum?]
      // else format=[weekNo, fecha, parcial, acum?]
      let fecha = '';
      let parcial = 0;
      let acum: number | undefined;
      let weekNo = i;
      if (/^\d{4}-\d{2}-\d{2}$/.test(cells[0])) {
        fecha = cells[0];
        parcial = parseMoney(cells[1]);
        acum = cells[2] ? parseMoney(cells[2]) : undefined;
      } else if (/^\d{1,2}-[a-zA-Z]{3}-\d{2,4}$/.test(cells[0])) {
        fecha = parseFlexDate(cells[0]);
        parcial = parseMoney(cells[1]);
        acum = cells[2] ? parseMoney(cells[2]) : undefined;
      } else {
        weekNo = Number(cells[0]) || i;
        fecha = /^\d{4}-\d{2}-\d{2}$/.test(cells[1])
          ? cells[1]
          : parseFlexDate(cells[1]);
        parcial = parseMoney(cells[2]);
        acum = cells[3] ? parseMoney(cells[3]) : undefined;
      }
      return {
        weekNo,
        fechaCorte: fecha,
        progParcial: parcial,
        progParcialPct: 0,
        progAcumulado: acum ?? 0,
        progAcumuladoPct: 0,
      };
    });
    // If user didn't provide acumulados, build them
    if (parsed.every((r) => r.progAcumulado === 0)) {
      recomputeAcumulados(parsed);
    }
    setRows(parsed);
    setDirty(true);
    setShowPaste(false);
    setPasteText('');
  }

  if (loading) return <p className="text-sm text-gray-400">Cargando programa…</p>;

  const total = rows[rows.length - 1]?.progAcumulado ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-gray-500">
            {rows.length} semanas · Total programado{' '}
            <span className="font-semibold text-gray-900">{fmt(total)}</span>
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button onClick={() => setShowPaste(true)} className="btn-secondary">
              <FileSpreadsheet size={14} /> Pegar de Excel
            </button>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    '¿Restablecer el programa con distribución automática? Esto sobreescribe lo actual.'
                  )
                ) {
                  // Trigger auto-seed: clear locally then user clicks save
                  setRows([]);
                  setDirty(true);
                }
              }}
              className="btn-secondary"
            >
              <RotateCcw size={14} /> Auto-generar
            </button>
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="btn-primary"
            >
              <Save size={14} /> {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        )}
      </div>

      <div style={{ overflowX: 'auto' }} className="card" >
        <table className="data-table">
          <thead>
            <tr>
              <th>Semana</th>
              <th>Fecha Corte</th>
              <th style={{ textAlign: 'right' }}>Prog. Parcial</th>
              <th style={{ textAlign: 'right' }}>%</th>
              <th style={{ textAlign: 'right' }}>Prog. Acumulado</th>
              <th style={{ textAlign: 'right' }}>%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ width: 60, textAlign: 'center' }}>{r.weekNo}</td>
                <td style={{ width: 130 }}>
                  {canEdit ? (
                    <input
                      type="date"
                      value={r.fechaCorte}
                      onChange={(e) =>
                        updateCell(i, 'fechaCorte', e.target.value)
                      }
                    />
                  ) : (
                    r.fechaCorte
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {canEdit ? (
                    <input
                      type="number"
                      step="0.01"
                      value={r.progParcial}
                      onChange={(e) =>
                        updateCell(i, 'progParcial', e.target.value)
                      }
                      style={{ textAlign: 'right' }}
                    />
                  ) : (
                    fmt(r.progParcial)
                  )}
                </td>
                <td style={{ textAlign: 'right', color: '#6b7280' }}>
                  {r.progParcialPct.toFixed(2)}%
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                  {fmt(r.progAcumulado)}
                </td>
                <td style={{ textAlign: 'right', color: '#6b7280' }}>
                  {r.progAcumuladoPct.toFixed(2)}%
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>
                  Sin filas — pega desde Excel o presiona "Auto-generar"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showPaste && (
        <div className="modal-backdrop" onClick={() => setShowPaste(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-gray-900 mb-2">
              Pegar programa desde Excel
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Copia las columnas <strong>Fecha Corte</strong>,{' '}
              <strong>Prog. Parcial</strong> y{' '}
              <strong>Prog. Acumulado</strong> (opcional) de tu Excel y pégalas
              abajo. Las celdas pueden estar separadas por tab o coma.
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={14}
              className="input"
              style={{ fontFamily: 'monospace', fontSize: 12 }}
              placeholder={`2026-02-23\t$0.00\t$0.00
2026-03-02\t$1,466,285.02\t$1,466,285.02
2026-03-09\t$331,463.28\t$1,797,748.30
…`}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowPaste(false)} className="btn-secondary">
                Cancelar
              </button>
              <button onClick={handlePaste} className="btn-primary">
                Importar {pasteText.split('\n').filter((l) => l.trim()).length} filas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function parseMoney(s: string): number {
  return Number(s.replace(/[$,\s]/g, '')) || 0;
}

const MONTH_ES: Record<string, string> = {
  ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
  jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12',
  jan: '01', apr: '04', aug: '08', dec: '12',
};

function parseFlexDate(s: string): string {
  // "23-Feb-26" or "23/02/2026"
  const m = s.match(/^(\d{1,2})[-/]([a-zA-Z]{3,}|\d{1,2})[-/](\d{2,4})$/);
  if (!m) return s;
  const day = m[1].padStart(2, '0');
  let month = m[2].toLowerCase().slice(0, 3);
  if (MONTH_ES[month]) month = MONTH_ES[month];
  else month = m[2].padStart(2, '0');
  let year = m[3];
  if (year.length === 2) year = `20${year}`;
  return `${year}-${month}-${day}`;
}
