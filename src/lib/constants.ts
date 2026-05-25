import type { PublicRole, Role } from "../types/api";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administracion",
  voluntarios: "Voluntarios",
  personal: "Personal",
  servicio_social: "Servicio social",
  visitas: "Visitas",
  familiares: "Familiares",
  donantes: "Donantes",
  proveedores: "Proveedores"
};

export const PUBLIC_ROLES: PublicRole[] = [
  "voluntarios",
  "personal",
  "servicio_social",
  "visitas",
  "familiares",
  "donantes",
  "proveedores"
];

export const STATUS_LABELS = {
  pending: "Pendiente",
  authorized: "Autorizado",
  unauthorized: "Desautorizado"
} as const;
