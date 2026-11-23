import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { CitizenDashboardPage } from './pages/CitizenDashboardPage';
import { DigitalTwinPage } from './pages/DigitalTwinPage';
import { TrafficPage } from './pages/TrafficPage';
import { EnvironmentPage } from './pages/EnvironmentPage';
import { EnergyWaterPage } from './pages/EnergyWaterPage';
import { MultiAgentPage } from './pages/MultiAgentPage';
import { PredictiveAnalyticsPage } from './pages/PredictiveAnalyticsPage';
import { EmergencyPage } from './pages/EmergencyPage';
import { AiAssistantPage } from './pages/AiAssistantPage';
import { AdminManagementPage } from './pages/AdminManagementPage';
import { ReportsPage } from './pages/ReportsPage';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';
import { LocationManagementPage } from './pages/LocationManagementPage';

function RootRedirect() {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={isAdmin ? '/dashboard' : '/citizen'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<RootRedirect />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute adminOnly>
                <DashboardLayout>
                  <AdminDashboardPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/citizen"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CitizenDashboardPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/digital-twin"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DigitalTwinPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/locations"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <LocationManagementPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/traffic"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <TrafficPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/environment"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EnvironmentPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/resources"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EnergyWaterPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/agents"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <MultiAgentPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/predictions"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <PredictiveAnalyticsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/emergencies"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EmergencyPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/assistant"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AiAssistantPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <DashboardLayout>
                  <AdminManagementPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ReportsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ProfileSettingsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
