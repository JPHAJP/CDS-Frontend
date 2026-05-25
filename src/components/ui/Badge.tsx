import type { AuthorizationStatus, Role } from "../../types/api";
import { ROLE_LABELS, STATUS_LABELS } from "../../lib/constants";

export function StatusBadge({ status }: { status: AuthorizationStatus }) {
  const styles = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    authorized: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    unauthorized: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>{STATUS_LABELS[status]}</span>;
}

export function RoleBadge({ role }: { role: Role }) {
  return <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">{ROLE_LABELS[role]}</span>;
}
