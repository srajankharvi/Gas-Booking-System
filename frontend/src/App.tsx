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

// Unconditionally auto-login default student user session for demonstration
localStorage.setItem('token', 'MOCK-DEVELOPMENT-JWT-TOKEN');
localStorage.setItem('user', JSON.stringify({
  id: 'demo-user-id',
  name: 'John Student',
  email: 'demo@gastrack.com',
  mobile: '9876543210',
  address: '123 Smart Street, Tech City',
  role: 'admin',
  created_at: new Date().toISOString()
}));

// Guard for authenticated user views
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Guard for administrator actions
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
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
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="book" element={<BookCylinder />} />
          <Route path="bookings" element={<BookingsList />} />
          <Route path="usage" element={<UsageHistory />} />
          <Route path="settings" element={<Settings />} />
          
          {/* Admin routes protected by role */}
          <Route 
            path="admin" 
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } 
          />
          
          {/* Simulator route */}
          <Route path="simulator" element={<Simulator />} />
        </Route>
        
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
