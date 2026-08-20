import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { apiClient } from '../api/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleQuickLogin = (role: 'user' | 'admin') => {
    localStorage.setItem('token', 'MOCK-DEVELOPMENT-JWT-TOKEN');
    localStorage.setItem('user', JSON.stringify({
      id: role === 'admin' ? 'demo-admin-id' : 'demo-user-id',
      name: role === 'admin' ? 'John Admin' : 'John User',
      email: role === 'admin' ? 'admin@gastrack.com' : 'user@gastrack.com',
      mobile: '9876543210',
      address: '123 Smart Street, Tech City',
      role: role,
      created_at: new Date().toISOString()
    }));
    if (role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/api/auth/login', { email, password });
      const { access_token, user } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Subtle background color blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[50%] rounded-full bg-sky-500/5 blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[50%] rounded-full bg-blue-500/5 blur-[100px]" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="inline-flex items-center gap-2.5 text-sky-500 justify-center">
          <Activity size={36} />
          <span className="text-3xl font-black tracking-tight text-slate-900">GasTrack</span>
        </div>
        <h2 className="mt-5 text-3xl font-black text-slate-900 tracking-tight">
          Sign in to your account
        </h2>
        <p className="mt-2 text-sm text-slate-500 font-semibold">
          Or{' '}
          <Link to="/register" className="font-extrabold text-sky-600 hover:text-sky-700 transition-colors">
            register a new cylinder monitor
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow-xl border border-slate-200/80 sm:rounded-3xl sm:px-10">
          
          {error && (
            <div className="mb-4 bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3 text-rose-800 text-xs font-bold shadow-sm">
              <AlertCircle size={18} className="shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                Email Address / Mobile Number
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail size={16} />
                </div>
                <input
                  type="text"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all text-xs"
                  placeholder="Enter email or mobile"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                Security Password
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all text-xs"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-black rounded-xl text-xs shadow-md shadow-sky-500/10 transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <span className="block text-center text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">
              Quick Demonstration Sign Ins
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleQuickLogin('user')}
                className="py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
              >
                John Student
              </button>
              <button
                onClick={() => handleQuickLogin('admin')}
                className="py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
              >
                Platform Admin
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
