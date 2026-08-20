import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import BookCylinder from './pages/BookCylinder';
import BookingsList from './pages/BookingsList';
import UsageHistory from './pages/UsageHistory';
import AdminDashboard from './pages/AdminDashboard';
import Simulator from './pages/Simulator';
import Layout from './components/Layout';

// Auth guards for user and admin routes

// Guard for standard user routes
const UserRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (user && user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
};

// Guard for administrator actions
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected User Layout */}
        <Route 
          path="/" 
          element={
            <UserRoute>
              <Layout />
            </UserRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="book" element={<BookCylinder />} />
          <Route path="bookings" element={<BookingsList />} />
          <Route path="usage" element={<UsageHistory />} />
          <Route path="settings" element={<Settings />} />
          <Route path="simulator" element={<Simulator />} />
        </Route>

        {/* Protected Admin Layout */}
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
              <Layout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="simulator" element={<Simulator />} />
        </Route>
        
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
