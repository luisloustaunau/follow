import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Projects ──────────────────────────────────────────────
export const getProjects = () => api.get('/projects').then((r) => r.data);
export const getProject = (id: string) => api.get(`/projects/${id}`).then((r) => r.data);
export const createProject = (data: unknown) => api.post('/projects', data).then((r) => r.data);

// ─── Fronts ────────────────────────────────────────────────
export const getFronts = (projectId: string) =>
  api.get(`/projects/${projectId}/fronts`).then((r) => r.data);
export const createFront = (projectId: string, data: unknown) =>
  api.post(`/projects/${projectId}/fronts`, data).then((r) => r.data);

// ─── Weekly Reports ────────────────────────────────────────
export const getReports = (frontId: string) =>
  api.get(`/fronts/${frontId}/reports`).then((r) => r.data);
export const getReport = (frontId: string, reportId: string) =>
  api.get(`/fronts/${frontId}/reports/${reportId}`).then((r) => r.data);
export const createReport = (frontId: string, data: unknown) =>
  api.post(`/fronts/${frontId}/reports`, data).then((r) => r.data);
export const updateReport = (frontId: string, reportId: string, data: unknown) =>
  api.put(`/fronts/${frontId}/reports/${reportId}`, data).then((r) => r.data);

// ─── Estimations ──────────────────────────────────────────
export const getEstimations = (projectId: string) =>
  api.get(`/projects/${projectId}/estimations`).then((r) => r.data);
export const updateEstimation = (projectId: string, estId: string, data: unknown) =>
  api.put(`/projects/${projectId}/estimations/${estId}`, data).then((r) => r.data);
export const createEstimation = (projectId: string, data: unknown) =>
  api.post(`/projects/${projectId}/estimations`, data).then((r) => r.data);

// ─── Photo upload ─────────────────────────────────────────
export const getUploadUrl = (frontId: string, filename: string) =>
  api.get(`/fronts/${frontId}/upload-url`, { params: { filename } }).then((r) => r.data);
