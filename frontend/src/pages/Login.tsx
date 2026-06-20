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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-11 h-11 bg-red-800 rounded-xl mb-3 shadow-md">
            <span className="text-white text-lg font-bold">A</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ANMA Ingeniería</h1>
          <p className="text-sm text-gray-500 mt-1">Supervisión de obras</p>
        </div>

        {/* Card */}
        <div className="card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="field">
              <label>Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="input"
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div className="field">
              <label>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="input"
              />
            </div>

            {error && (
              <p style={{ color: '#dc2626', fontSize: '0.8rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 12px' }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
