import type {
  AbRateSetting,
  CashAdvance,
  CashAdvancePayload,
  CashAdvanceStatus,
  CashAdvanceUpdatePayload,
  CollectionPayload,
  CollectionRecord,
  DashboardSummary,
  Employee,
  EmployeePayload,
  EmployeeRole,
  EmployeeStatus,
  Expense,
  ExpenseCategory,
  ExpensePayload,
  ExpensesReportResponse,
  GrossRevenueReportResponse,
  LoginResponse,
  PayrollRecord,
  PayrollReportResponse,
  PayrollStatus,
  Trip,
  TripPayload,
  TripStatus,
  Truck,
  TruckPayload,
  TruckStatus,
  User,
} from "@/lib/types";

const RAW_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

const cleanUrl = RAW_API_URL.replace(/\/+$/, "");
const API_BASE_URL = cleanUrl.endsWith("/api/v1")
  ? cleanUrl
  : `${cleanUrl}/api/v1`;

const cleanUrl = RAW_API_URL.replace(/\/+$/, "");
const API_BASE_URL = cleanUrl.endsWith("/api/v1")
  ? cleanUrl
  : `${cleanUrl}/api/v1`;

const TOKEN_STORAGE_KEY = "truckops_sanctum_token";

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    errors: Record<string, string[]> = {}
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      "Cannot reach TruckOps API server. Confirm Laravel is running on http://127.0.0.1:8000.",
      0
    );
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/login") {
      setStoredToken(null);
    }

    const message =
      (payload && typeof payload.message === "string" && payload.message) ||
      `Request failed with status ${response.status}`;

    const errors =
      payload && typeof payload.errors === "object" && payload.errors !== null
        ? (payload.errors as Record<string, string[]>)
        : {};

    throw new ApiError(message, response.status, errors);
  }

  return payload as T;
}

function extractDownloadFilename(
  disposition: string | null,
  fallback: string
): string {
  if (!disposition) return fallback;
  const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";\n]+)/i);
  if (match && match[1]) {
    return match[1].replace(/"/g, "").trim();
  }
  return fallback;
}

async function downloadCsv(path: string, fallbackFilename: string): Promise<void> {
  const token = getStoredToken();
  const headers = new Headers();
  headers.set("Accept", "text/csv, application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { headers });
  } catch {
    throw new ApiError(
      "Cannot reach TruckOps API server. Confirm Laravel is running on http://127.0.0.1:8000.",
      0
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      setStoredToken(null);
    }

    const contentType = response.headers.get("Content-Type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : null;

    const message =
      (payload && typeof payload.message === "string" && payload.message) ||
      `Export failed with status ${response.status}`;

    const errors =
      payload && typeof payload.errors === "object" && payload.errors !== null
        ? (payload.errors as Record<string, string[]>)
        : {};

    throw new ApiError(message, response.status, errors);
  }

  const blob = await response.blob();
  const filename = extractDownloadFilename(
    response.headers.get("Content-Disposition"),
    fallbackFilename
  );

  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    logout: () =>
      request<{ message: string }>("/auth/logout", {
        method: "POST",
      }),
    user: () => request<User>("/auth/user"),
  },

  dashboard: {
    summary: (params: { start_date?: string; end_date?: string } = {}) =>
      request<DashboardSummary>(`/dashboard/summary${buildQuery(params)}`),
  },

  employees: {
    list: (params: { role?: EmployeeRole; status?: EmployeeStatus } = {}) =>
      request<Employee[]>(`/employees${buildQuery(params)}`),
    get: (id: number) => request<Employee>(`/employees/${id}`),
    create: (data: EmployeePayload) =>
      request<Employee>("/employees", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<EmployeePayload>) =>
      request<Employee>(`/employees/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    updateStatus: (id: number, status: EmployeeStatus) =>
      request<Employee>(`/employees/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
  },

  trucks: {
    list: (params: { status?: TruckStatus } = {}) =>
      request<Truck[]>(`/trucks${buildQuery(params)}`),
    get: (id: number) => request<Truck>(`/trucks/${id}`),
    create: (data: TruckPayload) =>
      request<Truck>("/trucks", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<TruckPayload>) =>
      request<Truck>(`/trucks/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    updateStatus: (id: number, status: TruckStatus) =>
      request<Truck>(`/trucks/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
  },

  trips: {
    getAbRate: () => request<AbRateSetting>("/trips/ab-rate"),
    updateAbRate: (ab_rate_per_trip: number) =>
      request<AbRateSetting>("/trips/ab-rate", {
        method: "PUT",
        body: JSON.stringify({ ab_rate_per_trip }),
      }),
    list: (
      params: {
        status?: TripStatus;
        truck_id?: number;
        driver_id?: number;
        start_date?: string;
        end_date?: string;
      } = {}
    ) => request<Trip[]>(`/trips${buildQuery(params)}`),
    get: (id: number) => request<Trip>(`/trips/${id}`),
    create: (data: TripPayload) =>
      request<Trip>("/trips", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<TripPayload>) =>
      request<Trip>(`/trips/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    updateStatus: (id: number, status: TripStatus) =>
      request<Trip>(`/trips/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
  },

  collections: {
    list: (params: { start_date?: string; end_date?: string } = {}) =>
      request<CollectionRecord[]>(`/collections${buildQuery(params)}`),
    create: (data: CollectionPayload) =>
      request<CollectionRecord>("/collections", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<CollectionPayload>) =>
      request<CollectionRecord>(`/collections/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<{ message: string }>(`/collections/${id}`, {
        method: "DELETE",
      }),
  },

  expenses: {
    categories: () => request<ExpenseCategory[]>("/expenses/categories"),
    createCategory: (name: string) =>
      request<ExpenseCategory>("/expenses/categories", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    list: (
      params: {
        category_id?: number;
        truck_id?: number;
        start_date?: string;
        end_date?: string;
      } = {}
    ) => request<Expense[]>(`/expenses${buildQuery(params)}`),
    create: (data: ExpensePayload) =>
      request<Expense>("/expenses", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<ExpensePayload>) =>
      request<Expense>(`/expenses/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<{ message: string }>(`/expenses/${id}`, {
        method: "DELETE",
      }),
  },

  advances: {
    list: (
      params: { employee_id?: number; status?: CashAdvanceStatus } = {}
    ) => request<CashAdvance[]>(`/advances${buildQuery(params)}`),
    create: (data: CashAdvancePayload) =>
      request<CashAdvance>("/advances", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: CashAdvanceUpdatePayload) =>
      request<CashAdvance>(`/advances/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },

  payroll: {
    list: (
      params: {
        employee_id?: number;
        status?: PayrollStatus;
        start_date?: string;
        end_date?: string;
      } = {}
    ) => request<PayrollRecord[]>(`/payroll${buildQuery(params)}`),
    generate: (data: { period_start: string; period_end: string }) =>
      request<PayrollRecord[]>("/payroll/generate", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    pay: (id: number) =>
      request<PayrollRecord>(`/payroll/${id}/pay`, {
        method: "PATCH",
      }),
  },

  reports: {
    grossRevenueJson: (
      params: { start_date?: string; end_date?: string } = {}
    ) =>
      request<GrossRevenueReportResponse>(
        `/reports/gross-revenue/export${buildQuery({ ...params, format: "json" })}`
      ),
    expensesJson: (
      params: {
        category_id?: number;
        truck_id?: number;
        start_date?: string;
        end_date?: string;
      } = {}
    ) =>
      request<ExpensesReportResponse>(
        `/reports/expenses/export${buildQuery({ ...params, format: "json" })}`
      ),
    payrollJson: (
      params: {
        employee_id?: number;
        status?: PayrollStatus;
        start_date?: string;
        end_date?: string;
      } = {}
    ) =>
      request<PayrollReportResponse>(
        `/reports/payroll/export${buildQuery({ ...params, format: "json" })}`
      ),
    downloadGrossRevenueCsv: (
      params: { start_date?: string; end_date?: string } = {}
    ) =>
      downloadCsv(
        `/reports/gross-revenue/export${buildQuery(params)}`,
        "gross-revenue-report.csv"
      ),
    downloadExpensesCsv: (
      params: {
        category_id?: number;
        truck_id?: number;
        start_date?: string;
        end_date?: string;
      } = {}
    ) =>
      downloadCsv(
        `/reports/expenses/export${buildQuery(params)}`,
        "expenses-report.csv"
      ),
    downloadPayrollCsv: (
      params: {
        employee_id?: number;
        status?: PayrollStatus;
        start_date?: string;
        end_date?: string;
      } = {}
    ) =>
      downloadCsv(
        `/reports/payroll/export${buildQuery(params)}`,
        "payroll-report.csv"
      ),
  },
};
