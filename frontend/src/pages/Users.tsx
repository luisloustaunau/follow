import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createUser } from '../lib/api';
import { ChevronRight, UserPlus, Check } from 'lucide-react';
import type { Role } from '../types';

const ROLES: { value: Role; label: string; description: string }[] = [
  { value: 'supervisor', label: 'Supervisor',  description: 'Puede enviar reportes semanales y ver estimaciones' },
  { value: 'billing',    label: 'Facturación', description: 'Puede crear y actualizar estimaciones y facturas' },
  { value: 'owner',      label: 'Owner',       description: 'Acceso completo — crear proyectos, frentes y usuarios' },
];

export function Users() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'supervisor' as Role });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
    setSuccess('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError('Todos los campos son requeridos.');
      return;
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createUser(form);
      setSuccess(`Usuario ${form.email} creado correctamente.`);
      setForm({ name: '', email: '', password: '', role: 'supervisor' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Error al crear el usuario. ¿Ya existe esta cuenta?');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to="/" className="hover:text-gray-700">Proyectos</Link>
        <ChevronRight size={14} />
        <span className="text-gray-800 font-medium">Gestionar usuarios</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Gestionar usuarios</h1>
      <p className="text-sm text-gray-400 mb-8">Crea cuentas para supervisores y equipo de facturación.</p>

      <div className="max-w-lg">
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-red-800 p-2 rounded-lg">
              <UserPlus size={16} className="text-white" />
            </div>
            <h2 className="font-semibold text-gray-900">Nuevo usuario</h2>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
            <div className="field">
              <label>Nombre completo</label>
              <input
                className="input"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Ej. Ing. Carlos Mendoza"
                autoComplete="off"
              />
            </div>

            <div className="field">
              <label>Correo electrónico</label>
              <input
                className="input"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="carlos@anma.mx"
                autoComplete="off"
              />
            </div>

            <div className="field">
              <label>Contraseña inicial</label>
              <input
                className="input"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            <div className="field">
              <label>Rol</label>
              <select
                className="input"
                name="role"
                value={form.role}
                onChange={handleChange}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {ROLES.find((r) => r.value === form.role)?.description}
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            {success && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                <Check size={14} />
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Creando…' : 'Crear usuario'}
            </button>
          </form>
        </div>

        {/* Role reference */}
        <div className="mt-4 bg-gray-50 border border-gray-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Referencia de roles</p>
          <div style={{ display: 'grid', gap: 8 }}>
            {ROLES.map((r) => (
              <div key={r.value} className="flex items-start gap-2">
                <span className="text-xs font-semibold text-gray-700 min-w-20 capitalize">{r.label}</span>
                <span className="text-xs text-gray-500">{r.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
