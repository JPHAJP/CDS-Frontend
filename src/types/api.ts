export type Role =
  | "admin"
  | "voluntarios"
  | "personal"
  | "servicio_social"
  | "visitas"
  | "familiares"
  | "donantes"
  | "proveedores";

export type PublicRole = Exclude<Role, "admin">;
export type AuthorizationStatus = "pending" | "authorized" | "unauthorized";
export type AccessType = "entry" | "exit";
export type AccessStatus = "in" | "out";

export interface LastAccessLog {
  id: string;
  access_type: AccessType;
  timestamp: string;
  notes: string | null;
  is_manual: boolean;
  manual_by_admin_id: string | null;
  manual_by_admin_name: string | null;
}

export interface User {
  id: string;
  email: string;
  nombre_completo: string;
  apellidos: string;
  direccion: string;
  edad: number;
  telefono: string;
  role: Role;
  is_super_admin: boolean;
  is_authorized: boolean;
  password_change_required: boolean;
  profile_photo_url: string | null;
  access_status: AccessStatus;
  authorization_status: AuthorizationStatus;
  authorization_info: string;
  created_at: string;
  authorized_at: string | null;
  unauthorized_at: string | null;
  authorized_by_id?: string | null;
  authorized_by_name?: string | null;
  unauthorized_by_id?: string | null;
  unauthorized_by_name?: string | null;
  last_access_log?: LastAccessLog | null;
}

export interface AuthResponse {
  user: User;
  token_type: "cookie";
}

export interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface AdminStats {
  users_total: number;
  users_authorized: number;
  users_pending: number;
  users_by_role: Record<Role, number>;
}

export interface CurrentQr {
  qr_code?: string;
  code?: string;
  qr_url?: string;
  expires_at?: string;
  expiresAt?: string;
  data_url?: string;
  inside_count?: number;
}

export interface AccessLog {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  qr_code_id: string;
  access_type: AccessType;
  timestamp: string;
  notes: string | null;
  is_manual: boolean;
  manual_by_admin_id: string | null;
  manual_by_admin_name: string | null;
}

export interface AccessLogsResponse {
  total_entries: number;
  total_exits: number;
  currently_inside: number;
  logs: AccessLog[];
}

export interface UserInside {
  id: string;
  email: string;
  nombre_completo: string;
  apellidos: string;
  role: Role;
  profile_photo_url?: string | null;
  access_status: AccessStatus;
  entry_time: string;
  entry_id: string;
}

export interface ScanResponse {
  message: string;
  access_log?: {
    id: string;
    access_type: AccessType;
    timestamp: string;
    is_manual?: boolean;
    notes?: string | null;
    manual_by_admin_id?: string | null;
    manual_by_admin_name?: string | null;
  };
  access_status?: AccessStatus;
}
