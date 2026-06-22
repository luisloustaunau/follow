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
  advance?: number;
  coordinator?: string;
  service?: string;
}

export interface Front {
  id: string;
  projectId: string;
  name: string;
  supervisorId?: string;
  location?: string;
  amount?: number;
}

export interface WeeklyReport {
  id: string;
  frontId: string;
  weekNo: number;
  reportDate: string;
  progParcialScheduled: number;
  progAcumScheduled: number;
  progPctScheduled: number;
  avanceFisicoReal: number;
  avanceFisicoRealAcum: number;
  avanceFisicoPct: number;
  avanceFinancieroReal: number;
  avanceFinancieroRealAcum: number;
  avanceFinancieroPct: number;
  description: string;
  observations: string;
  photos: string[];
  submittedBy?: string;
  submittedByName?: string;
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
  period: string;
  periodMonth: string;
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
  progAcumulado: number;
  progAcumuladoPct: number;
}

export interface MonthProgramRow {
  month: string;       // YYYY-MM
  monthLabel: string;
  amount: number;
  pct: number;
  daysInWindow: number;
}
