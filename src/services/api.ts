const BASE_URL = import.meta.env.VITE_API_URL || "https://hrmsbackends.onrender.com/api";

console.log("🔥 BASE_URL:", BASE_URL);

/* ============================================================
   TOKEN STORAGE
   ============================================================ */
export const tokenStorage = {
  getAccess:  () => localStorage.getItem("hrms_access_token"),
  getRefresh: () => localStorage.getItem("hrms_refresh_token"),
  set: (access: string, refresh: string) => {
    localStorage.setItem("hrms_access_token", access);
    localStorage.setItem("hrms_refresh_token", refresh);
  },
  clear: () => {
    localStorage.removeItem("hrms_access_token");
    localStorage.removeItem("hrms_refresh_token");
    localStorage.removeItem("hrms_current");
  },
};

/* ============================================================
   API ERROR CLASS
   ============================================================ */
export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name   = "ApiError";
    this.status = status;
    this.data   = data;
  }
}

/* ============================================================
   REFRESH TOKEN
   ============================================================ */
async function attemptRefresh(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    tokenStorage.set(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

/* ============================================================
   BASE FETCH
   ============================================================ */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<any> {
  const token = tokenStorage.getAccess();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = `${BASE_URL}${endpoint}`;
  console.log(`📡 ${options.method || "GET"} ${url}`);

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401 && retry) {
    const refreshed = await attemptRefresh();
    if (refreshed) return apiFetch(endpoint, options, false);
    else {
      tokenStorage.clear();
      window.location.href = "/";
      return;
    }
  }

  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(data.message || "Request failed", response.status, data);
  }
  return data;
}

/* ============================================================
   AUTH API
   ============================================================ */
export const authApi = {
  signup: async (name: string, email: string, password: string, role: string) => {
    const data = await apiFetch("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role }),
    });
    tokenStorage.set(data.accessToken, data.refreshToken);
    localStorage.setItem("hrms_current", JSON.stringify(data.user));
    return data;
  },

  login: async (email: string, password: string, role: string) => {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, role }),
    });
    tokenStorage.set(data.accessToken, data.refreshToken);
    localStorage.setItem("hrms_current", JSON.stringify(data.user));
    return data;
  },

  /* ── Google Login ── */
  googleLogin: async (email: string) => {
    const data = await apiFetch("/auth/google-login", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    tokenStorage.set(data.accessToken, data.refreshToken);
    localStorage.setItem("hrms_current", JSON.stringify(data.user));
    return data;
  },

  logout: async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } finally {
      tokenStorage.clear();
    }
  },

  resetPassword: async (email: string, newPassword: string) =>
    apiFetch("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, newPassword }),
    }),

  changePassword: async (oldPassword: string, newPassword: string) =>
    apiFetch("/auth/change-password", {
      method: "PUT",
      body: JSON.stringify({ oldPassword, newPassword }),
    }),

  getMe: async () => apiFetch("/auth/me"),
};

/* ============================================================
   PROFILE API
   ============================================================ */
export const profileApi = {
  get: async () => apiFetch("/profile"),

  update: async (updates: {
    name?:       string;
    phone?:      string;
    department?: string;
    avatar?:     string;
  }) =>
    apiFetch("/profile", {
      method: "PUT",
      body: JSON.stringify(updates),
    }),

  deleteAccount: async () => apiFetch("/profile", { method: "DELETE" }),
};

/* ============================================================
   DASHBOARD API
   ============================================================ */
export const dashboardApi = {
  getStats: async () => apiFetch("/dashboard/stats"),

  getUsers: async (params?: {
    role?:   string;
    search?: string;
    page?:   number;
    limit?:  number;
  }) => {
    const query = new URLSearchParams(
      Object.entries(params || {})
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return apiFetch(`/dashboard/users${query ? `?${query}` : ""}`);
  },

  updateUser: async (id: string, updates: any) =>
    apiFetch(`/dashboard/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),

  deleteUser: async (id: string) =>
    apiFetch(`/dashboard/users/${id}`, { method: "DELETE" }),
};

/* ============================================================
   ATTENDANCE API
   ============================================================ */
export const attendanceApi = {
  checkIn:     () => apiFetch("/attendance/checkin",  { method: "POST" }),
  checkOut:    () => apiFetch("/attendance/checkout", { method: "POST" }),
  getToday:    () => apiFetch("/attendance/today"),
  getMy:       () => apiFetch("/attendance/my"),
  getAll:      () => apiFetch("/attendance/all"),
  getTodayAll: () => apiFetch("/attendance/today-all"),

  addManual: (data: {
    employeeName: string;
    employeeRole: string;
    startDate:    string;
    endDate:      string;
    checkIn:      string;
    checkOut?:    string;
  }) =>
    apiFetch("/attendance/manual", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getManual:    ()           => apiFetch("/attendance/manual"),
  deleteManual: (id: string) => apiFetch(`/attendance/manual/${id}`, { method: "DELETE" }),
};

/* ============================================================
   LEAVE API
   ============================================================ */
export const leaveApi = {
  apply: (data: {
    type:              string;
    isEmergency?:      boolean;
    priority?:         string;
    startDate:         string;
    endDate:           string;
    reason:            string;
    description?:      string;
    emergencyContact?: string;
  }) =>
    apiFetch("/leaves/apply", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMy:      () => apiFetch("/leaves/my"),
  getPending: () => apiFetch("/leaves/pending"),
  getAll:     () => apiFetch("/leaves/all"),

  approve: (id: string) =>
    apiFetch(`/leaves/${id}/approve`, { method: "PUT" }),

  reject: (id: string, reason?: string) =>
    apiFetch(`/leaves/${id}/reject`, {
      method: "PUT",
      body: JSON.stringify({ reason: reason || "" }),
    }),

  addManual: (data: {
    employeeName: string;
    type:         string;
    startDate:    string;
    endDate:      string;
    reason:       string;
    status?:      string;
    priority?:    string;
  }) =>
    apiFetch("/leaves/manual", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getManual:    ()           => apiFetch("/leaves/manual"),
  deleteManual: (id: string) => apiFetch(`/leaves/manual/${id}`, { method: "DELETE" }),
};

/* ============================================================
   TASK API
   ============================================================ */
export const taskApi = {
  create: (data: any) =>
    apiFetch("/tasks", { method: "POST", body: JSON.stringify(data) }),

  getAll: () => apiFetch("/tasks/all"),
  getMy:  () => apiFetch("/tasks/my"),

  getAssignable: () => apiFetch("/tasks/assignable"),

  update: (id: string, data: any) =>
    apiFetch(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  delete: (id: string) => apiFetch(`/tasks/${id}`, { method: "DELETE" }),

  addUpdate: (id: string, data: any) =>
    apiFetch(`/tasks/${id}/update`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getAllFiltered: (params: {
    status?:     string;
    priority?:   string;
    assignedTo?: string;
    startDate?:  string;
    endDate?:    string;
    range?:      string;
  }) => {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return apiFetch(`/tasks/all${query ? `?${query}` : ""}`);
  },

  createManual: (data: {
    title:        string;
    description?: string;
    assignedTo?:  string;
    assignedBy?:  string;
    priority?:    string;
    dueDate?:     string;
    status?:      string;
    createdAt?:   string;
    updates?:     any[];
  }) =>
    apiFetch("/tasks/manual", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  bulkManual: (tasks: any[]) =>
    apiFetch("/tasks/manual/bulk", {
      method: "POST",
      body: JSON.stringify({ tasks }),
    }),

  getReport: (params: {
    range?:     "this_week" | "this_month" | "custom";
    startDate?: string;
    endDate?:   string;
    status?:    string;
    priority?:  string;
  }) => {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return apiFetch(`/tasks/report${query ? `?${query}` : ""}`);
  },
};

/* ============================================================
   PROJECT API
   ============================================================ */
export const projectApi = {
  create: (data: any) =>
    apiFetch("/projects", { method: "POST", body: JSON.stringify(data) }),

  createManual: (data: any) =>
    apiFetch("/projects/manual", { method: "POST", body: JSON.stringify(data) }),

  getAll:      () => apiFetch("/projects/all"),
  getMy:       () => apiFetch("/projects/my"),
  getManagers: () => apiFetch("/projects/managers"),
  getMembers:  () => apiFetch("/projects/members"),

  update: (id: string, data: any) =>
    apiFetch(`/projects/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  delete: (id: string) => apiFetch(`/projects/${id}`, { method: "DELETE" }),
};

/* ============================================================
   PAYROLL API
   ============================================================ */
export const payrollApi = {
  create: (data: {
    userId:           string;
    month:            string;
    basicSalary:      number;
    paidLeaveDays?:   number;
    paymentMode?:     string;
    remarks?:         string;
    extraAllowances?: { special?: number; other?: number };
    extraDeductions?: { tds?: number; other?: number };
  }) =>
    apiFetch("/payroll", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  bulk: (data: { month: string; paidLeaveDays?: number }) =>
    apiFetch("/payroll/bulk", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getAll: (params?: {
    month?:     string;
    status?:    string;
    role?:      string;
    startDate?: string;
    endDate?:   string;
  }) => {
    const query = new URLSearchParams(
      Object.entries(params || {})
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return apiFetch(`/payroll/all${query ? `?${query}` : ""}`);
  },

  getMy: () => apiFetch("/payroll/my"),

  process: (data?: { month?: string }) =>
    apiFetch("/payroll/process", {
      method: "POST",
      body: JSON.stringify(data || {}),
    }),

  update: (id: string, data: {
    presentDays?:  number;
    leaveDays?:    number;
    status?:       string;
    paymentMode?:  string;
    remarks?:      string;
    allowances?:   { special?: number; other?: number };
    deductions?:   { tds?: number; other?: number };
  }) =>
    apiFetch(`/payroll/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) => apiFetch(`/payroll/${id}`, { method: "DELETE" }),
};

/* ============================================================
   CLIENT API
   ============================================================ */
export const clientApi = {
  create: (data: any) =>
    apiFetch("/clients", { method: "POST", body: JSON.stringify(data) }),

  getAll: () => apiFetch("/clients"),

  update: (id: string, data: any) =>
    apiFetch(`/clients/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  delete: (id: string) => apiFetch(`/clients/${id}`, { method: "DELETE" }),

  createInvoice: (data: any) =>
    apiFetch("/clients/invoices", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getInvoices: () => apiFetch("/clients/invoices"),
};

/* ============================================================
   CALENDAR API
   ============================================================ */
export const calendarApi = {
  create: (data: any) =>
    apiFetch("/calendar", { method: "POST", body: JSON.stringify(data) }),

  getEvents: () => apiFetch("/calendar"),
  getAll:    () => apiFetch("/calendar/all"),

  update: (id: string, data: any) =>
    apiFetch(`/calendar/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  delete: (id: string) => apiFetch(`/calendar/${id}`, { method: "DELETE" }),
};

/* ============================================================
   DAILY STATUS API
   ============================================================ */
export const dailyStatusApi = {
  submit: (data: any) =>
    apiFetch("/daily-status", { method: "POST", body: JSON.stringify(data) }),

  getMy:  () => apiFetch("/daily-status/my"),
  getAll: () => apiFetch("/daily-status/all"),

  addComment: (id: string, comment: string) =>
    apiFetch(`/daily-status/${id}/comment`, {
      method: "POST",
      body: JSON.stringify({ comment }),
    }),
};

/* ============================================================
   TIMESHEET API
   ============================================================ */
export const timesheetApi = {
  add: (data: any) =>
    apiFetch("/timesheets", { method: "POST", body: JSON.stringify(data) }),

  getMy:  () => apiFetch("/timesheets/my"),
  getAll: () => apiFetch("/timesheets/all"),

  approve: (id: string) =>
    apiFetch(`/timesheets/${id}/approve`, { method: "PUT" }),

  reject: (id: string) =>
    apiFetch(`/timesheets/${id}/reject`, { method: "PUT" }),
};

/* ============================================================
   VENDOR API
   ============================================================ */
export const vendorApi = {
  create: (data: any) =>
    apiFetch("/vendors", { method: "POST", body: JSON.stringify(data) }),

  getAll: () => apiFetch("/vendors"),

  update: (id: string, data: any) =>
    apiFetch(`/vendors/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  delete: (id: string) => apiFetch(`/vendors/${id}`, { method: "DELETE" }),
};

/* ============================================================
   FREELANCER API
   ============================================================ */
export const freelancerApi = {
  create: (data: any) =>
    apiFetch("/freelancers", { method: "POST", body: JSON.stringify(data) }),

  getAll: () => apiFetch("/freelancers"),

  update: (id: string, data: any) =>
    apiFetch(`/freelancers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) => apiFetch(`/freelancers/${id}`, { method: "DELETE" }),
};

/* ============================================================
   ONBOARDING API
   ============================================================ */
export const onboardingApi = {
  create: (data: any) =>
    apiFetch("/onboarding", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getAll: () => apiFetch("/onboarding"),

  toggleTask: (onboardingId: string, taskId: string) =>
    apiFetch(`/onboarding/${onboardingId}/tasks/${taskId}`, {
      method: "PATCH",
    }),

  deleteOnboarding: (id: string) =>
    apiFetch(`/onboarding/${id}`, { method: "DELETE" }),

  createOffboarding: (data: any) =>
    apiFetch("/onboarding/offboarding", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getAllOffboarding: () => apiFetch("/onboarding/offboarding"),

  toggleClearance: (offboardingId: string, key: string) =>
    apiFetch(`/onboarding/offboarding/${offboardingId}/clear`, {
      method: "PATCH",
      body: JSON.stringify({ key }),
    }),

  deleteOffboarding: (id: string) =>
    apiFetch(`/onboarding/offboarding/${id}`, { method: "DELETE" }),

  createManual: (data: any) =>
    apiFetch("/onboarding/manual", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createManualOffboarding: (data: any) =>
    apiFetch("/onboarding/offboarding/manual", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

/* ============================================================
   HELPDESK API
   ============================================================ */
export const helpdeskApi = {
  create: (data: {
    title:       string;
    description: string;
    category:    string;
    priority:    string;
  }) =>
    apiFetch("/helpdesk", { method: "POST", body: JSON.stringify(data) }),

  getMy: () => apiFetch("/helpdesk/my"),

  getAll: (params?: { status?: string; category?: string; priority?: string }) => {
    const query = new URLSearchParams(
      Object.entries(params || {})
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return apiFetch(`/helpdesk/all${query ? `?${query}` : ""}`);
  },

  getStats: () => apiFetch("/helpdesk/stats"),
  getById:  (id: string) => apiFetch(`/helpdesk/${id}`),

  update: (id: string, data: {
    status?:         string;
    priority?:       string;
    assignedTo?:     string;
    resolutionNote?: string;
  }) =>
    apiFetch(`/helpdesk/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  editMine: (id: string, data: {
    title?:       string;
    description?: string;
    category?:    string;
    priority?:    string;
  }) =>
    apiFetch(`/helpdesk/${id}/edit`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) => apiFetch(`/helpdesk/${id}`, { method: "DELETE" }),

  addComment: (id: string, text: string) =>
    apiFetch(`/helpdesk/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  deleteComment: (ticketId: string, commentId: string) =>
    apiFetch(`/helpdesk/${ticketId}/comments/${commentId}`, {
      method: "DELETE",
    }),
};

/* ============================================================
   USER MANAGEMENT API  (Admin only)
   ============================================================ */
export const userManagementApi = {
  getStats: () => apiFetch("/users/stats"),

  getAll: (params?: {
    role?:     string;
    search?:   string;
    isActive?: string;
    page?:     number;
    limit?:    number;
  }) => {
    const query = new URLSearchParams(
      Object.entries(params || {})
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return apiFetch(`/users${query ? `?${query}` : ""}`);
  },

  getById: (id: string) => apiFetch(`/users/${id}`),

  create: (data: {
    name:              string;
    email:             string;
    password:          string;
    role?:             string;
    phone?:            string;
    dob?:              string;
    department?:       string;
    designation?:      string;
    address?:          string;
    joiningDate?:      string;
    gender?:           string;
    emergencyContact?: string;
    avatar?:           string;
  }) =>
    apiFetch("/users", { method: "POST", body: JSON.stringify(data) }),

  update: (id: string, data: Partial<{
    name:              string;
    email:             string;
    password:          string;
    role:              string;
    phone:             string;
    dob:               string;
    department:        string;
    designation:       string;
    address:           string;
    joiningDate:       string;
    gender:            string;
    emergencyContact:  string;
    avatar:            string;
    isActive:          boolean;
  }>) =>
    apiFetch(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  delete: (id: string) =>
    apiFetch(`/users/${id}`, { method: "DELETE" }),

  toggleStatus: (id: string) =>
    apiFetch(`/users/${id}/toggle-status`, { method: "PATCH" }),

  resetPassword: (id: string, newPassword: string) =>
    apiFetch(`/users/${id}/reset-password`, {
      method: "PATCH",
      body: JSON.stringify({ newPassword }),
    }),
};
