import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { NewProject } from './pages/NewProject';
import { ProjectDetail } from './pages/ProjectDetail';
import { NewFront } from './pages/NewFront';
import { FrontDetail } from './pages/FrontDetail';
import { NewReport } from './pages/NewReport';
import { ReportDetail } from './pages/ReportDetail';
import { Estimations } from './pages/Estimations';
import { AllReports } from './pages/AllReports';
import { AllEstimations } from './pages/AllEstimations';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
              <Route path="/reports" element={<ErrorBoundary><AllReports /></ErrorBoundary>} />
              <Route path="/estimations" element={<ErrorBoundary><AllEstimations /></ErrorBoundary>} />
              <Route path="/projects/new" element={<ErrorBoundary><NewProject /></ErrorBoundary>} />
              <Route path="/projects/:projectId" element={<ErrorBoundary><ProjectDetail /></ErrorBoundary>} />
              <Route path="/projects/:projectId/fronts/new" element={<ErrorBoundary><NewFront /></ErrorBoundary>} />
              <Route path="/projects/:projectId/fronts/:frontId" element={<ErrorBoundary><FrontDetail /></ErrorBoundary>} />
              <Route path="/projects/:projectId/fronts/:frontId/reports/new" element={<ErrorBoundary><NewReport /></ErrorBoundary>} />
              <Route path="/projects/:projectId/fronts/:frontId/reports/:reportId" element={<ErrorBoundary><ReportDetail /></ErrorBoundary>} />
              <Route path="/projects/:projectId/estimations" element={<ErrorBoundary><Estimations /></ErrorBoundary>} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  );
}
