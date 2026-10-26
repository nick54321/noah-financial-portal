import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, Navbar } from './components/Navigation';
import { Login, Register } from './pages/AuthPages';
import { Dashboard } from './pages/Dashboard';
import { Subscriptions } from './pages/Subscriptions';
import { IBANAccounts } from './pages/IBANAccounts';
import { Payouts } from './pages/Payouts';
import { Conversions } from './pages/Conversions';
import { OnboardingKYC } from './pages/OnboardingKYC';
import { WalletSettings } from './pages/WalletSettings';
import { DomainMigration } from './pages/DomainMigration';
import { AdminPricing } from './pages/AdminPricing';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
        Loading Noah Financial Services Portal...
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Portal Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/subscriptions"
            element={
              <ProtectedRoute>
                <Layout>
                  <Subscriptions />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/accounts"
            element={
              <ProtectedRoute>
                <Layout>
                  <IBANAccounts />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/payouts"
            element={
              <ProtectedRoute>
                <Layout>
                  <Payouts />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/conversions"
            element={
              <ProtectedRoute>
                <Layout>
                  <Conversions />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Layout>
                  <OnboardingKYC />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/wallet"
            element={
              <ProtectedRoute>
                <Layout>
                  <WalletSettings />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/migration"
            element={
              <ProtectedRoute>
                <Layout>
                  <DomainMigration />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin={true}>
                <Layout>
                  <AdminPricing />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
