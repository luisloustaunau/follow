import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
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
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/reports" element={<AllReports />} />
            <Route path="/estimations" element={<AllEstimations />} />
            <Route path="/projects/new" element={<NewProject />} />
            <Route path="/projects/:projectId" element={<ProjectDetail />} />
            <Route path="/projects/:projectId/fronts/new" element={<NewFront />} />
            <Route path="/projects/:projectId/fronts/:frontId" element={<FrontDetail />} />
            <Route path="/projects/:projectId/fronts/:frontId/reports/new" element={<NewReport />} />
            <Route path="/projects/:projectId/fronts/:frontId/reports/:reportId" element={<ReportDetail />} />
            <Route path="/projects/:projectId/estimations" element={<Estimations />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
