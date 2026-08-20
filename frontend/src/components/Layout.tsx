import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Activity, Home, Calendar, Clock, BarChart3, Bell, Settings, 
  Terminal, ShieldCheck, LogOut, Menu, X, CheckSquare, Trash2 
} from 'lucide-react';
import { apiClient, API_BASE_URL } from '../api/client';

export default function Layout() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  
  const location = useLocation();
  const navigate = useNavigate();

  // Load user data
  useEffect(() => {
    const rawUser = localStorage.getItem('user');
    if (!rawUser) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(rawUser);
    setUser(parsedUser);

    // Fetch initial notifications
    const fetchNotifications = async () => {
      try {
        const res = await apiClient.get('/api/notifications');
        setNotifications(res.data);
      } catch (err) {
        console.error('Error fetching notifications', err);
      }
    };
    fetchNotifications();

    // Establish WebSocket Connection for Real-Time Updates
    const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/api/ws/${parsedUser.id}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.event === 'notification') {
        // Add new notification to state
        setNotifications(prev => [data.data, ...prev]);
      }
    };

    websocket.onerror = (err) => console.error('WebSocket Error:', err);
    websocket.onclose = () => console.log('WebSocket closed.');

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (ws) ws.close();
    navigate('/login');
  };

  const markAllRead = async () => {
    try {
      await apiClient.post('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotif = async (id: string) => {
    try {
      await apiClient.delete(`/api/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!user) return null;

  const menuItems = user.role === 'admin' ? [
    { name: 'Admin Dashboard', path: '/admin', icon: ShieldCheck },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
    { name: 'IoT Simulator', path: '/admin/simulator', icon: Terminal },
  ] : [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Book Cylinder', path: '/book', icon: Calendar },
    { name: 'My Bookings', path: '/bookings', icon: Clock },
    { name: 'Usage History', path: '/usage', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
    { name: 'IoT Simulator', path: '/simulator', icon: Terminal },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-900 text-slate-100 overflow-x-hidden font-sans">
      
      {/* Mobile Top Header */}
      <header className="md:hidden bg-slate-800 border-b border-slate-700/50 p-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-2 text-sky-400">
          <Activity size={24} />
          <span className="font-extrabold text-lg tracking-tight text-white">GasTrack</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowNotifPanel(!showNotifPanel)} 
            className="relative p-2 text-slate-400 hover:text-slate-200"
          >
            <Bell size={22} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-rose-500 text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="p-2 text-slate-400 hover:text-slate-200"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`fixed md:sticky top-0 bottom-0 left-0 z-30 w-64 bg-slate-850 border-r border-slate-800/80 p-6 flex flex-col justify-between transform transition-transform duration-300 md:transform-none ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} h-screen`}>
        
        <div>
          {/* Logo */}
          <div className="hidden md:flex items-center gap-3 text-sky-400 mb-8">
            <Activity size={28} className="animate-pulse" />
            <div>
              <h1 className="font-black text-xl tracking-tight text-white leading-tight">GasTrack</h1>
              <p className="text-[9px] uppercase tracking-widest text-sky-500 font-bold">Book • Monitor • Relax</p>
            </div>
          </div>
          
          {/* Nav Links */}
          <nav className="space-y-1.5">
            {menuItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link 
                  key={idx} 
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm border ${
                    isActive 
                      ? 'bg-sky-500/10 text-sky-400 border-sky-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
                      : 'text-slate-400 border-transparent hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Icon size={18} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Profile Card & Logout */}
        <div className="border-t border-slate-800 pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <h4 className="font-bold text-sm text-slate-200 truncate">{user.name}</h4>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest block mt-0.5">
                {user.role} Account
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setShowNotifPanel(true)} 
              className="relative flex-1 py-2 bg-slate-800 hover:bg-slate-7.5 border border-slate-700/50 rounded-xl flex items-center justify-center gap-2 text-xs text-slate-300 font-semibold cursor-pointer"
            >
              <Bell size={14} />
              Alerts
              {unreadCount > 0 && (
                <span className="bg-rose-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
            
            <button 
              onClick={handleLogout}
              className="py-2 px-3 bg-slate-800 hover:bg-rose-500/15 border border-slate-700/50 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full relative z-10">
        <Outlet />
      </main>

      {/* Notifications Drawer */}
      {showNotifPanel && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setShowNotifPanel(false)}
          />
          
          <div className="relative w-full max-w-md bg-slate-850 h-full border-l border-slate-850 flex flex-col justify-between shadow-2xl p-6">
            <div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <Bell className="text-sky-400" size={20} />
                  <h3 className="font-bold text-lg text-slate-200">Notification Center</h3>
                </div>
                <button 
                  onClick={() => setShowNotifPanel(false)} 
                  className="text-slate-400 hover:text-slate-200 p-1"
                >
                  <X size={20} />
                </button>
              </div>

              {unreadCount > 0 && (
                <button 
                  onClick={markAllRead}
                  className="w-full mb-4 py-2 bg-slate-800 hover:bg-slate-7.5 border border-slate-700/50 rounded-xl flex items-center justify-center gap-2 text-xs text-sky-400 font-bold cursor-pointer"
                >
                  <CheckSquare size={14} />
                  Mark all as read
                </button>
              )}

              {/* Notification Items List */}
              <div className="space-y-3 overflow-y-auto max-h-[70vh] pr-1">
                {notifications.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Bell size={32} className="mx-auto text-slate-600 mb-2" />
                    <p className="text-sm">No notifications recorded yet.</p>
                  </div>
                ) : (
                  notifications.map((notif, idx) => (
                    <div 
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all relative group ${
                        notif.read 
                          ? 'bg-slate-850/40 border-slate-800 text-slate-400' 
                          : 'bg-slate-800/80 border-slate-700/60 text-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-start pr-6">
                        <span className={`text-xs font-bold ${
                          notif.type.includes('critical') 
                            ? 'text-rose-400' 
                            : notif.type.includes('low') 
                            ? 'text-amber-400' 
                            : 'text-sky-400'
                        }`}>
                          {notif.title}
                        </span>
                        
                        <button 
                          onClick={() => deleteNotif(notif.id)}
                          className="absolute top-4 right-4 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <p className="text-xs mt-1 leading-relaxed">{notif.message}</p>
                      <span className="text-[9px] text-slate-600 block mt-2">
                        {new Date(notif.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="text-center text-xs text-slate-600 border-t border-slate-800 pt-4">
              Real-time push notifications powered by WebSockets.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
