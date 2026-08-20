import { Navbar } from './Navbar';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AlertTriangle } from 'lucide-react';

export function Layout() {
  const { sessionWarning, logout } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      {sessionWarning && (
        <div style={{
          background: '#fef3c7',
          borderBottom: '1px solid #f59e0b',
          padding: '8px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: '#92400e',
        }}>
          <AlertTriangle size={14} />
          <span>Tu sesión expira en menos de 15 minutos.</span>
          <button
            onClick={logout}
            style={{ marginLeft: 8, fontWeight: 600, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', fontSize: 13 }}
          >
            Volver a iniciar sesión
          </button>
        </div>
      )}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
      <footer style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', padding: '12px 24px', borderTop: '1px solid #f3f4f6' }}>
        © {new Date().getFullYear()} ANMA Ingeniería · Información confidencial · Uso exclusivo para supervisión de obra ·{' '}
        Protección de datos: LFPDPPP
      </footer>
    </div>
  );
}
