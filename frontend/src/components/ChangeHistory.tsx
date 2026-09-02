import { useState } from 'react';
import { History, ChevronDown, ChevronRight } from 'lucide-react';
import type { AuditEntry } from '../types';

interface Props {
  history?: AuditEntry[];
  lastEditedByName?: string;
  lastEditedAt?: string;
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Values arrive as whatever DynamoDB stored. Money is shown as currency so a
 * change of 12000 -> 15000 reads the way it does everywhere else in the app.
 */
function fmtValue(value: unknown, field: string): string {
  if (value === null || value === undefined || value === '') return '(vacío)';
  const moneyFields = [
    'amount',
    'amountWithIVA',
    'deductions',
    'liquid',
    'parcialFisico',
    'parcialFinanciero',
    'avanceFisicoReal',
    'avanceFinancieroReal',
  ];
  if (moneyFields.includes(field) && typeof value === 'number') {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 2,
    }).format(value);
  }
  const text = String(value);
  // Long free-text edits are truncated so one paragraph doesn't swamp the list.
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

/**
 * Collapsible change history (FUN-009).
 *
 * Shown on estimaciones and reportes so it is always answerable who changed an
 * amount, an estatus or a fecha de pago — the fields that back invoicing.
 */
export function ChangeHistory({ history, lastEditedByName, lastEditedAt }: Props) {
  const [open, setOpen] = useState(false);
  const entries = [...(history ?? [])].reverse(); // newest first

  if (entries.length === 0) {
    return (
      <div style={{ marginTop: 24, fontSize: 13, color: '#9ca3af' }}>
        <History size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
        Sin modificaciones registradas desde su creación.
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 600,
          color: '#374151',
        }}
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <History size={15} />
        Historial de cambios ({entries.length})
      </button>

      {lastEditedByName && lastEditedAt && (
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, marginLeft: 22 }}>
          Última modificación por {lastEditedByName} el {fmtDateTime(lastEditedAt)}
        </div>
      )}

      {open && (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: '12px 0 0 22px',
            borderLeft: '2px solid #e5e7eb',
          }}
        >
          {entries.map((e, i) => (
            <li key={`${e.at}-${e.field}-${i}`} style={{ padding: '8px 0 8px 14px' }}>
              <div style={{ fontSize: 13, color: '#111827' }}>
                <strong>{e.label}</strong>{' '}
                <span style={{ color: '#6b7280' }}>cambió de</span>{' '}
                <span style={{ color: '#b91c1c' }}>{fmtValue(e.from, e.field)}</span>{' '}
                <span style={{ color: '#6b7280' }}>a</span>{' '}
                <span style={{ color: '#15803d' }}>{fmtValue(e.to, e.field)}</span>
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                {e.byName} · {fmtDateTime(e.at)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
