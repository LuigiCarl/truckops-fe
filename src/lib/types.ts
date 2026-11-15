export type EmployeeRole = "Driver" | "Helper";
export type PayType = "Daily" | "Trip";
export type EmployeeStatus = "Active" | "Inactive";

export type TruckStatus =
  | "Available"
  | "Assigned"
  | "Under Maintenance"
  | "Inactive";

export type TripStatus = "Draft" | "Completed" | "Cancelled";

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  contact_number: string | null;
  role: EmployeeRole;
  pay_type: PayType;
  base_rate: string;
  ot_per_trip_rate: string;
  status: EmployeeStatus;
  created_at?: string;
  updated_at?: string;
}

export interface Truck {
  id: number;
  plate_number: string;
  description: string | null;
  registration_expiry: string | null;
  status: TruckStatus;
  created_at?: string;
  updated_at?: string;
}

export interface Trip {
  id: number;
  date: string;
  truck_id: number;
  driver_id: number;
  helper_id: number | null;
  reference_no: string | null;
  regular_trips: number;
  overtime_trips: number;
  total_trips: number;
  is_overtime: boolean;
  ab_rate_per_trip: string;
  ab_flat_rate_applied: string;
  driver_base_pay_applied?: string;
  driver_ot_pay_applied?: string;
  driver_pay_applied: string;
  helper_base_pay_applied?: string | null;
  helper_ot_pay_applied?: string | null;
  helper_pay_applied: string | null;
  remarks: string | null;
  status: TripStatus;
  truck?: Truck;
  driver?: Employee;
  helper?: Employee | null;
  created_at?: string;
  updated_at?: string;
}

export interface DashboardSummary {
  active_trucks: number;
  active_employees: number;
  total_completed_trips: number;
  calculated_earnings: number;
  total_expenses: number;
  total_payroll_paid: number;
  total_payroll_unpaid: number;
  total_employee_compensation: number;
  total_collections: number;
  outstanding_ab_balance: number;
  net_cash_flow: number;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface DateRange {
  start_date: string;
  end_date: string;
}

export interface EmployeePayload {
  first_name: string;
  last_name: string;
  contact_number: string | null;
  role: EmployeeRole;
  pay_type: PayType;
  base_rate: number;
  ot_per_trip_rate: number;
  status?: EmployeeStatus;
}

export interface TruckPayload {
  plate_number: string;
  description: string | null;
  registration_expiry: string | null;
  status?: TruckStatus;
}

export interface TripPayload {
  date: string;
  truck_id: number;
  driver_id: number;
  helper_id: number | null;
  reference_no: string | null;
  regular_trips: number;
  overtime_trips: number;
  ab_rate_per_trip?: number;
  driver_pay_applied?: number | null;
  helper_pay_applied?: number | null;
  remarks: string | null;
  status?: TripStatus;
}

export interface AbRateSetting {
  ab_rate_per_trip: string;
  updated_draft_trips?: number;
}

export interface CollectionRecord {
  id: number;
  payment_date: string;
  amount_received: string;
  reference_notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CollectionPayload {
  payment_date: string;
  amount_received: number;
  reference_notes: string | null;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface Expense {
  id: number;
  date: string;
  category_id: number;
  amount: string;
  description: string | null;
  truck_id: number | null;
  category?: ExpenseCategory;
  truck?: Truck | null;
  created_at?: string;
  updated_at?: string;
}

export interface ExpensePayload {
  date: string;
  category_id: number;
  amount: number;
  description: string | null;
  truck_id: number | null;
}

export type CashAdvanceStatus = "Active" | "Paid";

export interface CashAdvance {
  id: number;
  employee_id: number;
  date_issued: string;
  total_amount: string;
  fixed_deduction_rate: string;
  remaining_balance: string;
  status: CashAdvanceStatus;
  employee?: Employee;
  created_at?: string;
  updated_at?: string;
}

export interface CashAdvancePayload {
  employee_id: number;
  date_issued: string;
  total_amount: number;
  fixed_deduction_rate: number;
}

export interface CashAdvanceUpdatePayload extends Partial<CashAdvancePayload> {
  remaining_balance?: number;
  status?: CashAdvanceStatus;
}

export type PayrollStatus = "Unpaid" | "Paid";

export interface PayrollRecord {
  id: number;
  employee_id: number;
  period_start: string;
  period_end: string;
  total_base_pay: string;
  total_ot_pay: string;
  advance_deduction_applied: string;
  net_payable: string;
  status: PayrollStatus;
  employee?: Employee;
  created_at?: string;
  updated_at?: string;
}

export interface GrossRevenueReportResponse {
  data: Trip[];
  summary: {
    total_completed_trips: number;
    total_gross_revenue: number;
  };
}

export interface ExpensesReportResponse {
  data: Expense[];
  summary: {
    total_records: number;
    total_expenses: number;
  };
}

export interface PayrollReportResponse {
  data: PayrollRecord[];
  summary: {
    total_records: number;
    total_base_pay: number;
    total_ot_pay: number;
    total_advance_deduction: number;
    total_net_payable: number;
  };
}
