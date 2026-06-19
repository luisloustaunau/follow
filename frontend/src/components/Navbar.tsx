import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard, FileText, DollarSign, LogOut } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const links = [
    { to: '/', label: 'Proyectos', icon: <LayoutDashboard size={16} /> },
    { to: '/reports', label: 'Reportes', icon: <FileText size={16} /> },
    { to: '/estimations', label: 'Estimaciones', icon: <DollarSign size={16} /> },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-bold text-red-800 text-lg tracking-tight">ANMA</span>
        <div className="flex gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-red-800 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              {l.icon}
              {l.label}
            </NavLink>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm text-gray-600">
        <span>{user?.name}</span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 text-gray-400 hover:text-red-700 transition-colors"
        >
          <LogOut size={15} />
          Salir
        </button>
      </div>
    </nav>
  );
}
