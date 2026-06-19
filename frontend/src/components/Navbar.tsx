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
    <nav className="bg-white border-b border-gray-100 px-6 py-0 flex items-center justify-between h-14 sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-red-800 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <span className="font-bold text-gray-900 text-sm tracking-tight">ANMA</span>
        </div>
        <div className="flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 h-14 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-red-800 text-red-800'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-200'
                }`
              }
            >
              {l.icon}
              {l.label}
            </NavLink>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1.5">
          <div className="w-6 h-6 bg-red-800 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-semibold">{user?.name?.[0]}</span>
          </div>
          <span className="text-sm font-medium text-gray-700">{user?.name?.split(' ')[0]}</span>
          <span className="text-xs bg-gray-200 text-gray-500 rounded-full px-2 py-0.5 capitalize">{user?.role}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-700 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
        >
          <LogOut size={14} />
          Salir
        </button>
      </div>
    </nav>
  );
}
