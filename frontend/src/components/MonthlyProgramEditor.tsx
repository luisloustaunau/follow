import { useEffect, useState } from 'react';
import { getMonthlyProgram, saveMonthlyProgram } from '../lib/api';
import type { MonthProgramRow } from '../types';
import { Save, FileSpreadsheet } from 'lucide-react';

interface Props {
  projectId: string;
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
 * Programa de Estimaciones — the monthly billing baseline.
 * Auto-seeded on project creation, editable by owner.
 */
export function MonthlyProgramEditor({ projectId, canEdit }: Props) {
  const [rows, setRows] = useState<MonthProgramRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');

  useEffect(() => {
    setLoading(true);
    getMonthlyProgram(projectId)
      .then((r) => {
        setRows([...r].sort((a, b) => a.month.localeCompare(b.month)));
        setDirty(false);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  function updateAmount(i: number, value: string) {
    setRows((rs) => {
      const next = [...rs];
      next[i] = { ...next[i], amount: Number(value) || 0 };
      const total = next.reduce((s, r) => s + r.amount, 0) || 1;
      next.forEach((r) => {
        r.pct = Number(((r.amount / total) * 100).toFixed(4));
      });
      return next;
    });
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      await saveMonthlyProgram(projectId, rows);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  function handlePaste() {
    // TSV: "JUNIO 2026 \t 417612.12"  or just "2026-06 \t 417612.12"
    const lines = pasteText
      .trim()
      .split(/\r?\n/)
      .map((l) => l.split(/\t|,|;/).map((c) => c.trim()))
      .filter((c) => c.length >= 2);
    const parsed: MonthProgramRow[] = lines.map((cells) => {
      const monthLabel = cells[0];
      const month = monthFromLabel(monthLabel) || monthLabel.slice(0, 7);
      return {
        month,
        monthLabel,
        amount: parseMoney(cells[1]),
        pct: 0,
        daysInWindow: 0,
      };
    });
    const total = parsed.reduce((s, r) => s + r.amount, 0) || 1;
    parsed.forEach((r) => {
      r.pct = Number(((r.amount / total) * 100).toFixed(4));
    });
    setRows(parsed);
    setDirty(true);
    setShowPaste(false);
    setPasteText('');
  }

  if (loading)
    return <p className="text-sm text-gray-400">Cargando programa…</p>;

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">
          {rows.length} meses · Total programado{' '}
          <span className="font-semibold text-gray-900">{fmt(total)}</span>
        </p>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowPaste(true)}
              className="btn-secondary"
            >
              <FileSpreadsheet size={14} /> Pegar de Excel
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

      <div style={{ overflowX: 'auto' }} className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Mes</th>
              <th style={{ textAlign: 'right' }}>Importe programado</th>
              <th style={{ textAlign: 'right' }}>%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.month}>
                <td style={{ fontWeight: 500 }}>{r.monthLabel}</td>
                <td style={{ textAlign: 'right' }}>
                  {canEdit ? (
                    <input
                      type="number"
                      step="0.01"
                      value={r.amount}
                      onChange={(e) => updateAmount(i, e.target.value)}
                      style={{ textAlign: 'right' }}
                    />
                  ) : (
                    fmt(r.amount)
                  )}
                </td>
                <td style={{ textAlign: 'right', color: '#6b7280' }}>
                  {r.pct.toFixed(2)}%
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  style={{
                    textAlign: 'center',
                    padding: 24,
                    color: '#9ca3af',
                  }}
                >
                  Sin filas — pega desde Excel
                </td>
              </tr>
            )}
            {rows.length > 0 && (
              <tr style={{ background: '#f9fafb', fontWeight: 700 }}>
                <td>TOTAL</td>
                <td style={{ textAlign: 'right' }}>{fmt(total)}</td>
                <td style={{ textAlign: 'right' }}>100.00%</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showPaste && (
        <div className="modal-backdrop" onClick={() => setShowPaste(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg text-gray-900 mb-2">
              Pegar programa de estimaciones
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Copia dos columnas: <strong>Mes</strong> (ej. "JUNIO 2026" o
              "2026-06") y <strong>Importe</strong> programado. Acepta tab,
              coma o punto y coma.
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={10}
              className="input"
              style={{ fontFamily: 'monospace', fontSize: 12 }}
              placeholder={`JUNIO 2026\t$417,612.12
JULIO 2026\t$466,807.63
AGOSTO 2026\t$466,807.63
…`}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowPaste(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button onClick={handlePaste} className="btn-primary">
                Importar
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

const MONTH_LOOKUP: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04',
  mayo: '05', junio: '06', julio: '07', agosto: '08',
  septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
};

function monthFromLabel(label: string): string | null {
  const m = label.toLowerCase().match(/([a-záéíóúñ]+)\s+(\d{4})/);
  if (!m) return null;
  const month = MONTH_LOOKUP[m[1]];
  if (!month) return null;
  return `${m[2]}-${month}`;
}
