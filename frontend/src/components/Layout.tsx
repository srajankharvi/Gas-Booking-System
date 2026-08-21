import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Activity, Home, Calendar, Clock, BarChart3, Bell, Settings, 
  Terminal, ShieldCheck, LogOut, Menu, X, CheckSquare, Trash2, Cpu, HelpCircle
} from 'lucide-react';
import { apiClient, API_BASE_URL } from '../api/client';

export default function Layout() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
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

    // Check device status
    const checkStatus = async () => {
      try {
        const res = await apiClient.get('/api/users/cylinders');
        if (res.data.length > 0) {
          const cylinderId = res.data[0].id;
          const statusRes = await apiClient.get(`/api/iot/cylinder/${cylinderId}/readings?limit=1`);
          if (statusRes.data && statusRes.data.length > 0) {
            setIsOnline(true);
          }
        }
      } catch {
        setIsOnline(false);
      }
    };
    checkStatus();

    // Establish WebSocket Connection for Real-Time Updates
    const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/api/ws/${parsedUser.id}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'notification') {
          setNotifications(prev => [data.data, ...prev]);
        } else if (data.event === 'cylinder_update') {
          setIsOnline(true);
        }
      } catch (e) {
        console.error(e);
      }
    };

    websocket.onerror = () => setIsOnline(false);
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
  ] : [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Book LPG', path: '/book', icon: Calendar },
    { name: 'My Bookings', path: '/bookings', icon: Clock },
    { name: 'Usage Analytics', path: '/usage', icon: BarChart3 },
    { name: 'IoT Device', path: '/iot', icon: Cpu },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  // Helper to get active page title
  const getPageTitleInfo = () => {
    const path = location.pathname;
    if (path === '/') return { title: 'Dashboard', desc: `Good evening, ${user.name.split(' ')[0]} 👋` };
    if (path === '/book') return { title: 'Book LPG Cylinder', desc: 'Secure your next cylinder refill instantly' };
    if (path === '/bookings') return { title: 'My LPG Bookings', desc: 'Track your booking requests and delivery timeline' };
    if (path === '/usage') return { title: 'Usage Analytics', desc: 'Detailed metrics and gas consumption insights' };
    if (path === '/iot') return { title: 'IoT Device Status', desc: 'Hardware pipeline status and ESP32 telemetry' };
    if (path === '/settings' || path === '/admin/settings') return { title: 'Settings', desc: 'Account and threshold configurations' };
    if (path === '/simulator' || path === '/admin/simulator') return { title: 'IoT Simulator', desc: 'Simulate load cell weight readings' };
    if (path === '/admin') return { title: 'Admin Dashboard', desc: 'Manage system users and refill requests' };
    return { title: 'GasTrack', desc: 'Automated LPG Monitoring System' };
  };

  const { title: pageTitle, desc: pageDesc } = getPageTitleInfo();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F7F9FC] text-[#111827] overflow-x-hidden font-sans">
      
      {/* Mobile Top Header */}
      <header className="md:hidden bg-white border-b border-slate-200/80 px-5 py-4 flex justify-between items-center sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2.5 text-sky-500">
          <Activity size={24} />
          <span className="font-black text-lg tracking-tight text-slate-900">GasTrack</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowNotifPanel(!showNotifPanel)} 
            className="relative p-2 text-slate-500 hover:text-sky-600 transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-rose-500 text-white text-[8px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="p-2 text-slate-500 hover:text-sky-600 transition-colors"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`fixed md:sticky top-0 bottom-0 left-0 z-35 w-64 bg-white border-r border-slate-200/80 p-6 flex flex-col justify-between transform transition-transform duration-300 md:transform-none ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} h-screen shadow-sm`}>
        
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 text-sky-500 mb-8 border-b border-slate-100 pb-5">
            <Activity size={32} className="shrink-0" />
            <div>
              <h1 className="font-black text-xl tracking-tight text-slate-900 leading-tight">GasTrack</h1>
              <p className="text-[9px] uppercase tracking-widest text-slate-400 font-extrabold mt-0.5">Book • Monitor • Relax</p>
            </div>
          </div>
          
          {/* Nav Links */}
          <nav className="space-y-1">
            {menuItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link 
                  key={idx} 
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-semibold text-sm border ${
                    isActive 
                      ? 'bg-sky-50 text-sky-600 border-sky-100/50 shadow-sm' 
                      : 'text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon size={18} />
                  {item.name}
                </Link>
              );
            })}
            
            {/* Notifications Drawer Toggle in Sidebar */}
            <button 
              onClick={() => {
                setShowNotifPanel(true);
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-semibold text-sm border border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900 text-left cursor-pointer"
            >
              <div className="relative">
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] h-3 w-3 rounded-full flex items-center justify-center font-bold" />
                )}
              </div>
              Notifications
            </button>

            {/* Help & Support Button */}
            <button 
              onClick={() => {
                setShowHelpModal(true);
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-semibold text-sm border border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900 text-left cursor-pointer"
            >
              <HelpCircle size={18} />
              Help & Support
            </button>
          </nav>
        </div>

        {/* Profile Card & Logout */}
        <div className="border-t border-slate-100 pt-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-sm shadow-inner border border-sky-100/50">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <h4 className="font-bold text-sm text-slate-900 truncate">{user.name}</h4>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mt-0.5">
                {user.role} Account
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={handleLogout}
              className="w-full py-2 bg-slate-50 hover:bg-rose-50 border border-slate-200/60 hover:border-rose-200 text-slate-600 hover:text-rose-600 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-h-screen">
        
        {/* Desktop Top Header */}
        <header className="hidden md:flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-sm">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">{pageTitle}</h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">{pageDesc}</p>
          </div>
          
          <div className="flex items-center gap-4">


            {/* Notification trigger */}
            <button 
              onClick={() => setShowNotifPanel(true)}
              className="relative p-2.5 text-slate-500 hover:bg-slate-50 border border-slate-200/80 rounded-xl transition-all cursor-pointer"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-rose-500 text-white text-[8px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            
            {/* Minimal Avatar */}
            <div className="h-10 w-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content Area */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full relative z-10 pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Menu */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 py-2.5 px-6 flex justify-around items-center z-45 shadow-lg">
        <Link to="/" className={`flex flex-col items-center gap-1 text-[10px] font-extrabold ${location.pathname === '/' ? 'text-sky-500' : 'text-slate-400'}`}>
          <Home size={20} />
          <span>Home</span>
        </Link>
        <Link to="/book" className={`flex flex-col items-center gap-1 text-[10px] font-extrabold ${location.pathname === '/book' ? 'text-sky-500' : 'text-slate-400'}`}>
          <Calendar size={20} />
          <span>Book</span>
        </Link>
        <Link to="/usage" className={`flex flex-col items-center gap-1 text-[10px] font-extrabold ${location.pathname === '/usage' ? 'text-sky-500' : 'text-slate-400'}`}>
          <BarChart3 size={20} />
          <span>Usage</span>
        </Link>
        <button 
          onClick={() => setShowNotifPanel(true)}
          className={`flex flex-col items-center gap-1 text-[10px] font-extrabold text-slate-400 relative`}
        >
          <div className="relative">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] h-3.5 w-3.5 rounded-full flex items-center justify-center font-bold" />
            )}
          </div>
          <span>Alerts</span>
        </button>
      </nav>

      {/* Notifications Drawer */}
      {showNotifPanel && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div 
            className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setShowNotifPanel(false)}
          />
          
          <div className="relative w-full max-w-md bg-white h-full border-l border-slate-200/80 flex flex-col justify-between shadow-2xl p-6">
            <div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <Bell className="text-sky-500" size={20} />
                  <h3 className="font-black text-lg text-slate-900">Notification Center</h3>
                </div>
                <button 
                  onClick={() => setShowNotifPanel(false)} 
                  className="text-slate-400 hover:text-slate-950 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {unreadCount > 0 && (
                <button 
                  onClick={markAllRead}
                  className="w-full mb-4 py-2 bg-sky-50 hover:bg-sky-100/60 border border-sky-100/50 text-sky-600 rounded-xl flex items-center justify-center gap-2 text-xs font-black transition-all cursor-pointer"
                >
                  <CheckSquare size={14} />
                  Mark all as read
                </button>
              )}

              {/* Notification Items List */}
              <div className="space-y-3 overflow-y-auto max-h-[75vh] pr-1">
                {notifications.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <Bell size={36} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm font-semibold">No notifications recorded yet.</p>
                  </div>
                ) : (
                  notifications.map((notif, idx) => (
                    <div 
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all relative group ${
                        notif.read 
                          ? 'bg-slate-50/40 border-slate-100 text-slate-500' 
                          : 'bg-slate-50/80 border-slate-200/80 text-slate-800'
                      }`}
                    >
                      <div className="flex justify-between items-start pr-6">
                        <span className={`text-xs font-bold ${
                          notif.type?.includes('critical') 
                            ? 'text-rose-600' 
                            : notif.type?.includes('low') 
                            ? 'text-amber-600' 
                            : 'text-sky-600'
                        }`}>
                          {notif.title}
                        </span>
                        
                        <button 
                          onClick={() => deleteNotif(notif.id)}
                          className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <p className="text-xs mt-1 leading-relaxed">{notif.message}</p>
                      <span className="text-[9px] text-slate-400 font-bold block mt-2">
                        {new Date(notif.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="text-center text-[10px] text-slate-400 font-bold border-t border-slate-100 pt-4">
              Real-time push notifications powered by WebSockets.
            </div>
          </div>
        </div>
      )}

      {/* Help & Support Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setShowHelpModal(false)}
          />
          
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-slate-200/80">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="text-sky-500" size={22} />
                <h3 className="font-extrabold text-lg text-slate-900">Help & Support</h3>
              </div>
              <button 
                onClick={() => setShowHelpModal(false)} 
                className="text-slate-400 hover:text-slate-950 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 text-xs leading-relaxed text-slate-600">
              <div>
                <h4 className="font-bold text-slate-900">How does LPG tracking work?</h4>
                <p className="mt-1">GasTrack connects to an IoT load cell sensor mounted under your cylinder. It reads the current gross weight, subtracts the cylinder empty weight (tare), and determines the remaining gas capacity percentage.</p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900">What is Smart Refill Prediction?</h4>
                <p className="mt-1">By analyzing daily gas weight updates, the system calculates your average consumption (kg/day) and projects the exact date the cylinder will empty, alerting you to order a refill beforehand.</p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Support Contacts</h4>
                <p className="mt-1">For hardware setup or billing help, contact support@gastrack.com or call toll-free: 1800-GAS-TRK.</p>
              </div>
            </div>
            
            <button 
              onClick={() => setShowHelpModal(false)}
              className="w-full mt-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-black shadow-md shadow-sky-500/10 transition-all cursor-pointer"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
