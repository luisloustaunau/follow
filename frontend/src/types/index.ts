export type Role = 'owner' | 'supervisor' | 'billing';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Project {
  id: string;
  name: string;
  contractNo: string;
  contractor: string;
  amountWithIVA: number;
  startDate: string;
  endDate: string;
  durationDays: number;
  advance?: number; // anticipo amount
  fronts?: Front[];
}

export interface Front {
  id: string;
  projectId: string;
  name: string;
  supervisorId?: string;
  location?: string;
}

export interface WeeklyReport {
  id: string;
  frontId: string;
  projectId: string;
  weekNo: number;
  reportDate: string; // YYYY-MM-DD (end of week / "fecha corte")
  // Scheduled progress
  progParcialScheduled: number;
  progAcumScheduled: number;
  progPctScheduled: number;
  // Physical real progress
  avanceFisicoReal: number;
  avanceFisicoRealAcum: number;
  avanceFisicoPct: number;
  // Financial real progress
  avanceFinancieroReal: number;
  avanceFinancieroRealAcum: number;
  avanceFinancieroPct: number;
  // Report content
  description: string;
  observations: string;
  photos: string[]; // S3 URLs
  submittedBy?: string;
  submittedAt?: string;
}

export type EstimationStatus =
  | 'POR_INGRESAR'
  | 'INGRESADA'
  | 'EN_REVISION'
  | 'APROBADA'
  | 'PAGADA';

export interface Estimation {
  id: string;
  projectId: string;
  estimationNo: string;
  period: string; // "Jun 2026"
  periodMonth: string; // "2026-06"
  amount: number;
  deductions: number;
  amountWithIVA: number;
  liquid: number;
  invoiceNo?: string;
  status: EstimationStatus;
  submittedDate?: string;
  paidDate?: string;
}

export interface ScheduleRow {
  weekNo: number;
  fechaCorte: string;
  progParcial: number;
  progParcialPct: number;
  progAcum: number;
  progAcumPct: number;
}
