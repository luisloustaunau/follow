import axios from 'axios';
import type {
  ScheduleRow,
  MonthProgramRow,
  WeeklyReport,
  Estimation,
} from '../types';

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
export const getProject = (id: string) =>
  api.get(`/projects/${id}`).then((r) => r.data);
export const createProject = (data: unknown) =>
  api.post('/projects', data).then((r) => r.data);

// ─── Fronts ────────────────────────────────────────────────
export const getFronts = (projectId: string) =>
  api.get(`/projects/${projectId}/fronts`).then((r) => r.data);
export const createFront = (projectId: string, data: unknown) =>
  api.post(`/projects/${projectId}/fronts`, data).then((r) => r.data);

// ─── Schedule (Programa de Obra) ───────────────────────────
export const getSchedule = (frontId: string): Promise<ScheduleRow[]> =>
  api.get(`/fronts/${frontId}/schedule`).then((r) => r.data);
export const saveSchedule = (
  frontId: string,
  rows: Partial<ScheduleRow>[]
) =>
  api
    .post(`/fronts/${frontId}/schedule`, { rows })
    .then((r) => r.data);
export const autoSeedSchedule = (projectId: string, frontId: string) =>
  api
    .post(`/projects/${projectId}/fronts/${frontId}/schedule`, {
      autoSeed: true,
    })
    .then((r) => r.data);

// ─── Weekly Reports ────────────────────────────────────────
export const getReports = (frontId: string): Promise<WeeklyReport[]> =>
  api.get(`/fronts/${frontId}/reports`).then((r) => r.data);
export const getReport = (
  frontId: string,
  reportId: string
): Promise<WeeklyReport> =>
  api.get(`/fronts/${frontId}/reports/${reportId}`).then((r) => r.data);
export const createReport = (frontId: string, data: unknown) =>
  api.post(`/fronts/${frontId}/reports`, data).then((r) => r.data);
export const updateReport = (
  frontId: string,
  reportId: string,
  data: unknown
) =>
  api.put(`/fronts/${frontId}/reports/${reportId}`, data).then((r) => r.data);
export const getReportPdfUrl = (
  frontId: string,
  reportId: string
): Promise<{ url: string }> =>
  api
    .get(`/fronts/${frontId}/reports/${reportId}/pdf`)
    .then((r) => r.data);

// ─── Estimations ──────────────────────────────────────────
export const getEstimations = (projectId: string): Promise<Estimation[]> =>
  api.get(`/projects/${projectId}/estimations`).then((r) => r.data);
export const createEstimation = (projectId: string, data: unknown) =>
  api.post(`/projects/${projectId}/estimations`, data).then((r) => r.data);
export const updateEstimation = (
  projectId: string,
  estId: string,
  data: unknown
) =>
  api
    .put(`/projects/${projectId}/estimations/${estId}`, data)
    .then((r) => r.data);

// ─── Monthly Program (Estimaciones programadas) ───────────
export const getMonthlyProgram = (
  projectId: string
): Promise<MonthProgramRow[]> =>
  api
    .get(`/projects/${projectId}/estimation-program`)
    .then((r) => r.data);
export const saveMonthlyProgram = (
  projectId: string,
  rows: Partial<MonthProgramRow>[]
) =>
  api
    .post(`/projects/${projectId}/estimation-program`, { rows })
    .then((r) => r.data);
export const getEstimationsPdfUrl = (
  projectId: string
): Promise<{ url: string }> =>
  api.get(`/projects/${projectId}/estimations/pdf`).then((r) => r.data);

// ─── Photo uploads ────────────────────────────────────────
export const getUploadUrl = (
  frontId: string,
  filename: string
): Promise<{ uploadUrl: string; key: string; contentType: string }> =>
  api
    .get(`/fronts/${frontId}/upload-url`, { params: { filename } })
    .then((r) => r.data);
export const getViewUrl = (key: string): Promise<{ url: string }> =>
  api.get('/uploads/view', { params: { key } }).then((r) => r.data);

/** Upload a file to S3 using a presigned URL. Returns the S3 key. */
export async function uploadPhoto(
  frontId: string,
  file: File
): Promise<string> {
  const { uploadUrl, key, contentType } = await getUploadUrl(
    frontId,
    file.name
  );
  await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  return key;
}

// ─── Global aggregate views ───────────────────────────────
export interface EnrichedReport extends WeeklyReport {
  projectId: string;
  projectName: string;
  projectContractNo: string;
  frontName: string;
}

export interface FrontStatus {
  frontId: string;
  frontName: string;
  projectId: string;
  projectName: string;
  projectContractNo: string;
  latestReport: EnrichedReport | null;
  reportCount: number;
}

export interface EnrichedEstimation extends Estimation {
  projectName: string;
  projectContractNo: string;
  projectContractor: string;
}

export const getAllReports = (): Promise<{
  reports: EnrichedReport[];
  frontStatus: FrontStatus[];
}> => api.get('/reports').then((r) => r.data);

export const getAllEstimations = (): Promise<{
  estimations: EnrichedEstimation[];
  projects: { id: string; name: string; contractNo: string; contractor: string; amountWithIVA: number }[];
}> => api.get('/estimations').then((r) => r.data);

