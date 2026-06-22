import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { isOfficeAuthenticated, setOfficeAuthenticated, validateOfficeLogin } from './auth';

export function OfficeLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/office';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (isOfficeAuthenticated()) {
    return <Navigate to="/office" replace />;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (validateOfficeLogin(username.trim(), password)) {
      setOfficeAuthenticated();
      navigate(from, { replace: true });
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-tropical-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-xl p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sunset to-orange-600 flex items-center justify-center">
            <ShieldCheck size={24} className="text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-sunset">Staff Access</div>
            <h1 className="text-2xl font-serif font-bold text-slate-900">Siam Voyage Office</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
              Username
            </label>
            <input
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            Sign in <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
