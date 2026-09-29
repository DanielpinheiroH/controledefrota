export interface User {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "USUARIO";
}
export interface Truck {
  id: number;
  plate: string;
  brand: string;
  model: string;
  version: string | null;
  manufacture_year: number | null;
  model_year: number | null;
  chassis: string | null;
  renavam: string | null;
  color: string | null;
  mileage: number;
  driver: string | null;
  notes: string | null;
  status: string;
  active: boolean;
  mileage_updated_at: string;
}
export interface Workshop {
  id: number;
  name: string;
  document: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  contact: string | null;
  notes: string | null;
  active: boolean;
}
export interface Service {
  description: string;
  value: string;
}
export interface Part {
  name: string;
  reference?: string;
  manufacturer?: string;
  quantity: string;
  unit_price: string;
  total?: string;
}
export interface Maintenance {
  id: number;
  truck_id: number;
  workshop_id: number | null;
  plan_id: number | null;
  type: string;
  category: string;
  description: string;
  date: string;
  mileage: number;
  status: string;
  notes: string | null;
  other_cost: string;
  parts_cost: string;
  labor_cost: string;
  total_cost: string;
  services: Service[];
  parts: Part[];
  plate: string;
  workshop_name: string | null;
}
export interface Plan {
  id: number;
  truck_id: number;
  name: string;
  interval_km: number | null;
  interval_months: number | null;
  baseline_km: number;
  baseline_date: string;
  warning_km: number;
  warning_days: number;
  active: boolean;
  state: "VERDE" | "AMARELO" | "VERMELHO";
  next_km: number | null;
  next_date: string | null;
  km_left: number | null;
  days_left: number | null;
  plate: string;
  truck_label: string;
  last_km: number;
  last_date: string;
}
export interface Attachment {
  id: number;
  filename: string;
  mime: string;
  kind: string;
  size: number;
  created_at: string;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
export interface Costs {
  total: string;
  parts: string;
  labor: string;
  other: string;
  by_truck: Record<string, string>;
  by_workshop: Record<string, string>;
  by_month: Record<string, string>;
}
export interface Dashboard {
  total: number;
  available: number;
  maintenance: number;
  stopped: number;
  upcoming: number;
  overdue: number;
  month_cost: string;
  year_cost: string;
  alerts: Plan[];
  recent: Maintenance[];
}
