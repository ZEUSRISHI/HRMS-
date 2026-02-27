/* ================= USER ================= */

export type UserRole = "admin" | "manager" | "employee";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  position: string;
  avatar?: string;
  joinDate: string;
  phone?: string;
  status: "active" | "inactive";
}

/* ================= ATTENDANCE ================= */

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: "present" | "absent" | "leave" | "holiday";
  notes?: string;
}

/* ================= LEAVE ================= */

export interface LeaveRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  type: "sick" | "vacation" | "personal" | "unpaid";
  status: "pending" | "approved" | "rejected";
  reason: string;
  approvedBy?: string;
}

/* ================= TASK ================= */

/* 👉 NEW: exported status type (fixes your error) */
export type TaskStatus = "pending" | "in-progress" | "completed";

/* 👉 Updated comment model */
export interface TaskComment {
  id: string;
  message: string;
  createdAt: string;
  createdBy: string;
}

/* 👉 Updated production task model */
export interface Task {
  id: string;

  title: string;
  description: string;

  assignedTo: string;
  assignedBy: string;

  priority: "low" | "medium" | "high";
  status: TaskStatus;

  category?: string;
  startDate?: string;
  dueDate: string;

  estimatedHours?: number;
  frequency: "daily" | "weekly" | "monthly" | "one-time";

  notes?: string;

  comments: TaskComment[];

  createdAt: string;
}

/* ================= DAILY STATUS ================= */

export interface DailyStatus {
  id: string;
  userId: string;
  date: string;
  status: string;
  achievements: string;
  blockers?: string;
  nextDayPlan?: string;
  managerComments?: ManagerComment[];
}

export interface ManagerComment {
  id: string;
  managerId: string;
  comment: string;
  timestamp: string;
}

/* ================= CALENDAR ================= */

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  type: "meeting" | "holiday" | "event" | "personal";
  startTime?: string;
  endTime?: string;
  attendees?: string[];
  location?: string;
}

/* ================= PAYROLL ================= */

export interface PayrollRecord {
  id: string;
  userId: string;
  month: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: "processed" | "pending";
  paymentDate?: string;
  payslipUrl?: string;
}

/* ================= CLIENT ================= */

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: "active" | "inactive";
  address?: string;
  totalProjects: number;
  outstandingBalance: number;
}

/* ================= INVOICE ================= */

export interface Invoice {
  id: string;
  clientId: string;
  projectId: string;
  invoiceNumber: string;
  amount: number;
  date: string;
  dueDate: string;
  status: "paid" | "pending" | "overdue";
  paidAmount: number;
  paymentDate?: string;
}

/* ================= PROJECT ================= */

export interface Project {
  id: string;
  name: string;
  clientId: string;
  description: string;
  startDate: string;
  endDate?: string;
  status: "planning" | "in-progress" | "completed" | "on-hold";
  progress: number;
  budget: number;
  spent: number;
  teamMembers: string[];
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  title: string;
  dueDate: string;
  status: "pending" | "completed";
  completedDate?: string;
}

/* ================= ONBOARDING ================= */

export interface OnboardingTask {
  id: string;
  task: string;
  completed: boolean;
}

export interface EmployeeOnboarding {
  id: string;
  userId: string;
  status: "pending" | "in-progress" | "completed";
  startDate: string;
  completedDate?: string;
  tasks: OnboardingTask[];
  documents: Document[];
}

/* ================= OFFBOARDING ================= */

export interface EmployeeOffboarding {
  id: string;
  userId: string;
  lastWorkingDay: string;
  reason: string;
  status: "initiated" | "in-progress" | "completed";
  clearanceStatus: {
    it: boolean;
    hr: boolean;
    finance: boolean;
    admin: boolean;
  };
  finalSettlement?: {
    amount: number;
    status: "pending" | "processed";
    date?: string;
  };
}

/* ================= DOCUMENT ================= */

export interface Document {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
  url?: string;
}

/* ================= TIME ENTRY ================= */

export interface TimeEntry {
  id: string;
  userId: string;
  date: string;
  projectId?: string;
  hours: number;
  description: string;
  category: "project" | "meeting" | "admin" | "other";
}

/* ================= ANALYTICS ================= */

export interface AnalyticsData {
  attendanceRate: number;
  taskCompletionRate: number;
  averageWorkHours: number;
  activeProjects: number;
  totalRevenue: number;
  outstandingPayments: number;
}