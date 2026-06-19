import { Navbar } from './Navbar';
import { Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
