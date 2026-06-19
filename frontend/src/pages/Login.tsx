import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('Correo o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-900 via-red-800 to-red-700 flex-col justify-between p-12">
        <div>
          <span className="text-white text-2xl font-bold tracking-tight">ANMA Ingeniería</span>
        </div>
        <div>
          <blockquote className="text-red-100 text-xl font-light leading-relaxed mb-4">
            "Supervisión técnica de obras con visibilidad en tiempo real."
          </blockquote>
          <div className="flex gap-6 mt-8">
            {[['Proyectos', 'Gestión de contratos'], ['Reportes', 'Avance semanal'], ['Estimaciones', 'Control de pagos']].map(([t, d]) => (
              <div key={t}>
                <p className="text-white font-semibold text-sm">{t}</p>
                <p className="text-red-200 text-xs mt-0.5">{d}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-red-300 text-xs">© 2026 ANMA Ingeniería</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="lg:hidden mb-6">
              <span className="text-red-800 text-2xl font-bold">ANMA</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Bienvenido</h1>
            <p className="text-gray-500 text-sm mt-1">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/30 focus:border-red-800 transition-all"
                placeholder="usuario@anma.mx"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/30 focus:border-red-800 transition-all"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-800 text-white py-3 rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-[0.99] transition-all disabled:opacity-50 shadow-sm shadow-red-800/20 mt-2"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
