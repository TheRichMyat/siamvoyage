import { Link, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, ScanLine } from 'lucide-react';
import { clearOfficeAuth } from './auth';

export function OfficeLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearOfficeAuth();
    navigate('/office/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-tropical-bg">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/office" className="flex items-baseline gap-2 leading-none" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            <span className="flex items-baseline">
              <span className="text-2xl italic font-semibold text-sunset">Siam</span>
              <span className="text-2xl italic font-semibold text-slate-900">Voyage</span>
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Office</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/office/scan"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-sunset px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <ScanLine size={16} /> Scan
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-sunset px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
