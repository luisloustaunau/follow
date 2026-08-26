import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { createUser, getUsers, updateUser, resetUserPassword } from '../lib/api';
import { UserPlus, KeyRound, ShieldCheck, ShieldOff, X } from 'lucide-react';

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt?: string;
  createdBy?: string | null;
  lastPasswordResetAt?: string | null;
}

const ROLES = [
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'billing', label: 'Facturación' },
  { value: 'owner', label: 'Administrador' },
];

const ROLE_LABEL: Record<string, string> = {
  supervisor: 'Supervisor',
  billing: 'Facturación',
  owner: 'Administrador',
};

const MIN_PASSWORD = 8;

function errText(e: unknown, fallback: string) {
  const r = e as { response?: { data?: { error?: string } } };
  return r?.response?.data?.error ?? fallback;
}

export function Users() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'supervisor' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const [resetFor, setResetFor] = useState<AppUser | null>(null);
  const [resetPwd, setResetPwd] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      setUsers(await getUsers());
    } catch (e) {
      setListError(errText(e, 'No se pudieron cargar los usuarios'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role !== 'owner') {
      navigate('/');
      return;
    }
    if (user) load();
  }, [user, navigate, load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (form.password.length < MIN_PASSWORD) {
      setFormError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`);
      return;
    }
    setSaving(true);
    try {
      await createUser(form);
      setNotice(
        `Usuario ${form.email} creado. Entrégale la contraseña de forma segura y pídele que la cambie.`
      );
      setForm({ name: '', email: '', password: '', role: 'supervisor' });
      setShowForm(false);
      await load();
    } catch (e) {
      setFormError(errText(e, 'No se pudo crear el usuario'));
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(u: AppUser, role: string) {
    setNotice('');
    setListError('');
    try {
      await updateUser(u.email, { role });
      setNotice(`Rol de ${u.name} actualizado a ${ROLE_LABEL[role]}`);
      await load();
    } catch (e) {
      setListError(errText(e, 'No se pudo cambiar el rol'));
    }
  }

  async function handleToggleActive(u: AppUser) {
    setNotice('');
    setListError('');
    const action = u.active ? 'desactivar' : 'reactivar';
    if (!confirm(`¿Seguro que deseas ${action} la cuenta de ${u.name}?`)) return;
    try {
      await updateUser(u.email, { active: !u.active });
      setNotice(`Cuenta de ${u.name} ${u.active ? 'desactivada' : 'reactivada'}`);
      await load();
    } catch (e) {
      setListError(errText(e, `No se pudo ${action} la cuenta`));
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetFor) return;
    setResetError('');
    if (resetPwd.length < MIN_PASSWORD) {
      setResetError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`);
      return;
    }
    setResetting(true);
    try {
      await resetUserPassword(resetFor.email, resetPwd);
      setNotice(
        `Contraseña de ${resetFor.name} restablecida. Entrégasela de forma segura y pídele que la cambie.`
      );
      setResetFor(null);
      setResetPwd('');
      await load();
    } catch (e) {
      setResetError(errText(e, 'No se pudo restablecer la contraseña'));
    } finally {
      setResetting(false);
    }
  }

  const inputCls =
    'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition-all';

  return (
    <>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Usuarios</h1>
            <p className="text-sm text-gray-500 mt-1">
              Solo el administrador puede crear cuentas y asignar roles.
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm((s) => !s);
              setFormError('');
            }}
            className="flex items-center gap-2 bg-red-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-red-900 transition-colors"
          >
            <UserPlus size={16} />
            {showForm ? 'Cancelar' : 'Nuevo usuario'}
          </button>
        </div>

        {notice && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3 flex items-start justify-between gap-3">
            <span>{notice}</span>
            <button onClick={() => setNotice('')} className="text-green-600 hover:text-green-900">
              <X size={16} />
            </button>
          </div>
        )}
        {listError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl px-4 py-3">
            {listError}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 shadow-sm space-y-4"
          >
            <h2 className="font-semibold text-gray-900">Crear cuenta</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="Ana Martínez"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Correo</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  placeholder="ana@anma.mx"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Contraseña temporal
                </label>
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={MIN_PASSWORD}
                  placeholder="mínimo 8 caracteres"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Rol</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className={inputCls}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              Entrega la contraseña en persona o por un canal seguro. El usuario debe cambiarla en
              su primer acceso. El sistema nunca muestra contraseñas guardadas.
            </p>

            {formError && <p className="text-sm text-red-700">{formError}</p>}

            <button
              type="submit"
              disabled={saving}
              className="bg-red-800 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-red-900 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Creando…' : 'Crear usuario'}
            </button>
          </form>
        )}

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <p className="text-sm text-gray-500 px-6 py-8 text-center">Cargando usuarios…</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-gray-500 px-6 py-8 text-center">No hay usuarios.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-6 py-3 font-medium">Usuario</th>
                  <th className="px-6 py-3 font-medium">Rol</th>
                  <th className="px-6 py-3 font-medium">Estado</th>
                  <th className="px-6 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => {
                  const isSelf = u.email === user?.email;
                  return (
                    <tr key={u.email} className={u.active ? '' : 'bg-gray-50/60'}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {u.name}
                          {isSelf && (
                            <span className="ml-2 text-xs text-gray-400 font-normal">(tú)</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={u.role}
                          disabled={isSelf}
                          onChange={(e) => handleRoleChange(u, e.target.value)}
                          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-800/20"
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                            u.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {u.active ? <ShieldCheck size={12} /> : <ShieldOff size={12} />}
                          {u.active ? 'Activo' : 'Desactivado'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setResetFor(u);
                              setResetPwd('');
                              setResetError('');
                            }}
                            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-800 border border-gray-200 hover:border-red-200 rounded-lg px-3 py-1.5 transition-colors"
                          >
                            <KeyRound size={13} />
                            Contraseña
                          </button>
                          <button
                            onClick={() => handleToggleActive(u)}
                            disabled={isSelf}
                            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:border-red-200 hover:text-red-800 text-gray-600"
                          >
                            {u.active ? 'Desactivar' : 'Reactivar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-6 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Referencia de roles</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex gap-3">
              <dt className="font-medium text-gray-700 w-32 shrink-0">Administrador</dt>
              <dd className="text-gray-600">
                Control total: proyectos, frentes, programa de obra, estimaciones y usuarios.
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="font-medium text-gray-700 w-32 shrink-0">Supervisor</dt>
              <dd className="text-gray-600">
                Envía reportes semanales y consulta proyectos. No modifica datos financieros.
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="font-medium text-gray-700 w-32 shrink-0">Facturación</dt>
              <dd className="text-gray-600">Crea estimaciones y actualiza su estatus de cobro.</dd>
            </div>
          </dl>
        </div>
      </div>

      {resetFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <form
            onSubmit={handleReset}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Restablecer contraseña</h2>
                <p className="text-sm text-gray-500 mt-0.5">{resetFor.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setResetFor(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nueva contraseña
              </label>
              <input
                type="text"
                value={resetPwd}
                onChange={(e) => setResetPwd(e.target.value)}
                required
                minLength={MIN_PASSWORD}
                autoFocus
                placeholder="mínimo 8 caracteres"
                className={inputCls}
              />
            </div>

            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              Las contraseñas se guardan cifradas y no pueden recuperarse. Aquí defines una nueva y
              se la entregas al usuario por un canal seguro.
            </p>

            {resetError && <p className="text-sm text-red-700">{resetError}</p>}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setResetFor(null)}
                className="text-sm text-gray-600 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={resetting}
                className="bg-red-800 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-red-900 disabled:opacity-50 transition-colors"
              >
                {resetting ? 'Guardando…' : 'Restablecer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
