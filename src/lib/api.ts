import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import type {
  AccessLogsResponse,
  AccessStatus,
  AccessType,
  AdminStats,
  AuthResponse,
  CurrentQr,
  PaginatedUsers,
  PublicRole,
  ScanResponse,
  User,
  UserInside
} from "../types/api";

function defaultApiBaseUrl() {
  if (typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    return "https://api-test.jphajp.com";
  }
  return "http://localhost:8000";
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl();
const CSRF_COOKIE = "cds_csrf";
const SESSION_HINT_COOKIE = "cds_session";
const CSRF_HEADER = "x-csrf-token";
const CSRF_EXEMPT_PATHS = new Set(["/auth/login", "/auth/register", "/auth/refresh", "/auth/csrf"]);
const REFRESH_EXEMPT_PATHS = new Set(["/auth/login", "/auth/register", "/auth/refresh", "/auth/csrf"]);

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { Accept: "application/json" }
});

export function apiWebSocketUrl(path: string) {
  const base = new URL(API_BASE_URL);
  base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
  base.pathname = path;
  base.search = "";
  return base.toString();
}

export function apiAssetUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

let csrfPromise: Promise<string> | null = null;
let refreshPromise: Promise<AuthResponse> | null = null;

function readCookie(name: string) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export function hasSessionHint() {
  return readCookie(SESSION_HINT_COOKIE) === "1";
}

export function clearSessionHint() {
  document.cookie = `${SESSION_HINT_COOKIE}=; Max-Age=0; path=/`;
}

async function ensureCsrfToken() {
  const existing = readCookie(CSRF_COOKIE);
  if (existing) return existing;
  csrfPromise ??= api.get<{ csrf_token: string }>("/auth/csrf").then((response) => response.data.csrf_token);
  try {
    return await csrfPromise;
  } finally {
    csrfPromise = null;
  }
}

function requestPath(config: InternalAxiosRequestConfig | undefined) {
  if (!config?.url) return "";
  return config.url.startsWith("http") ? new URL(config.url).pathname : config.url.split("?")[0];
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const method = config.method?.toUpperCase();
  const path = requestPath(config);
  if (method && !["GET", "HEAD", "OPTIONS"].includes(method) && !CSRF_EXEMPT_PATHS.has(path)) {
    config.headers.set(CSRF_HEADER, await ensureCsrfToken());
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const path = requestPath(config);
    if (error.response?.status === 401 && config && !config._retry && !REFRESH_EXEMPT_PATHS.has(path)) {
      config._retry = true;
      refreshPromise ??= api.post<AuthResponse>("/auth/refresh").then((response) => response.data);
      try {
        await refreshPromise;
        return api(config);
      } catch (refreshError) {
        clearSessionHint();
        throw refreshError;
      } finally {
        refreshPromise = null;
      }
    }
    if (error.response?.status === 401) clearSessionHint();
    return Promise.reject(error);
  }
);

export function apiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[]; error?: string } | undefined;
    if (Array.isArray(data?.message)) return data.message.join(". ");
    return data?.message ?? data?.error ?? "No se pudo completar la solicitud.";
  }
  return "No se pudo completar la solicitud.";
}

function cleanParams<T extends Record<string, unknown>>(params: T) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value !== undefined && value !== null));
}

export const authApi = {
  csrf: () => api.get<{ csrf_token: string }>("/auth/csrf").then((response) => response.data),
  login: (payload: { email: string; password: string }) => api.post<AuthResponse>("/auth/login", payload).then((response) => response.data),
  register: (payload: FormData) => api.post<User>("/auth/register", payload, { headers: { "Content-Type": "multipart/form-data" } }).then((response) => response.data),
  refresh: () => api.post<AuthResponse>("/auth/refresh").then((response) => response.data),
  logout: () => api.post<{ message: string }>("/auth/logout").then((response) => response.data),
  status: () => api.get<{ user: User } | User>("/auth/status").then((response) => response.data),
  profile: () => api.get<User>("/profile").then((response) => response.data),
  uploadProfilePhoto: (payload: FormData) => api.post<User>("/profile/photo", payload, { headers: { "Content-Type": "multipart/form-data" } }).then((response) => response.data)
};

export const qrApi = {
  currentAdmin: () => api.get<CurrentQr>("/qr/current").then((response) => response.data),
  currentPublic: () => api.get<CurrentQr>("/public/qr/current").then((response) => response.data),
  scan: (payload: { qr_code: string; access_type: AccessType }) => api.post<ScanResponse>("/qr/scan", payload).then((response) => response.data)
};

export const adminApi = {
  stats: () => api.get<AdminStats>("/admin/stats").then((response) => response.data),
  pending: (params: { page?: number; per_page?: number; role?: string }) => api.get<PaginatedUsers>("/admin/users/pending", { params: cleanParams(params) }).then((response) => response.data),
  search: (params: { page?: number; per_page?: number; category?: string; search?: string; include_pending?: string; authorization_status?: string }) =>
    api.get<PaginatedUsers>("/admin/users/search", { params: cleanParams(params) }).then((response) => response.data),
  authorize: (id: string) => api.post(`/admin/users/${id}/authorize`).then((response) => response.data),
  reject: (id: string) => api.post(`/admin/users/${id}/reject`).then((response) => response.data),
  promoteAdmin: (id: string, password: string) => api.post(`/admin/users/${id}/promote-admin`, { password }).then((response) => response.data),
  demoteAdmin: (id: string, payload: { password: string; role: PublicRole }) => api.post(`/admin/users/${id}/demote-admin`, payload).then((response) => response.data),
  unauthorize: (id: string, reason: string) => api.post(`/admin/users/${id}/unauthorize`, { reason }).then((response) => response.data),
  reauthorize: (id: string) => api.post(`/admin/users/${id}/reauthorize`).then((response) => response.data),
  accessLogs: (params: { page?: number; per_page?: number; date?: string; date_from?: string; date_to?: string; role?: string; access_type?: AccessType | "" }) =>
    api.get<AccessLogsResponse>("/admin/access-logs", { params: cleanParams(params) }).then((response) => response.data),
  accessLogsCsvUrl: (params: { date_from?: string; date_to?: string; role?: string; access_type?: AccessType | ""; include_pending?: string }) => {
    const url = new URL(`${API_BASE_URL}/admin/access-logs/export.csv`);
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
    return url.toString();
  },
  usersInside: () => api.get<UserInside[]>("/admin/users-inside").then((response) => response.data),
  manualExit: (id: string, notes?: string) => api.post(`/admin/users/${id}/manual-exit`, { notes }).then((response) => response.data),
  manualAccess: (id: string, payload: { access_type: AccessType; notes?: string }) => api.post<{ message: string; access_status: AccessStatus }>(`/admin/users/${id}/manual-access`, payload).then((response) => response.data),
  identificationBlob: (id: string) => api.get<Blob>(`/admin/users/${id}/identification-file`, { responseType: "blob" }).then((response) => response.data),
  identificationUrl: (id: string) => `${API_BASE_URL}/admin/users/${id}/identification-file`
};

export type RegisterPayload = {
  email: string;
  password: string;
  nombre_completo: string;
  apellidos: string;
  direccion: string;
  edad: string;
  telefono: string;
  role: PublicRole;
  foto_identificacion: File | null;
};
