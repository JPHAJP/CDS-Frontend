import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, Eye, KeyRound, LogIn, LogOut, Search, ShieldMinus, ShieldPlus, UserCog, UserMinus, UserRound, UserX, MoreVertical } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { RoleBadge, StatusBadge } from "../../components/ui/Badge";
import { Field, Input, Label, Select, Textarea } from "../../components/ui/Form";
import { Avatar, PageShell, Panel, ThemeToggle } from "../../components/ui/Shell";
import { adminApi, apiErrorMessage } from "../../lib/api";
import { PUBLIC_ROLES, ROLE_LABELS } from "../../lib/constants";
import { formatDate } from "../../lib/format";
import type { PublicRole, Role, User } from "../../types/api";
import { AdminQRPanel } from "../qr/QRPages";
import { useAuth } from "../auth/auth-context";

type Tab = "resumen" | "usuarios" | "accesos" | "dentro" | "qr";

export function AdminPage({ dark, onToggleTheme }: { dark: boolean; onToggleTheme: () => void }) {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("usuarios");
  const tabs: Array<[Tab, string]> = [
    ["resumen", "Resumen"],
    ["usuarios", "Usuarios"],
    ["accesos", "Accesos"],
    ["dentro", "Dentro"],
    ["qr", "QR"]
  ];
  return (
    <PageShell
      title="Administración"
      subtitle="Usuarios, autorizaciones y control de acceso"
      user={user}
      actions={<><ThemeToggle dark={dark} onToggle={onToggleTheme} /><Button variant="ghost"><Link to="/perfil" className="inline-flex items-center gap-2"><UserRound size={18} /><span className="hidden sm:inline">Perfil</span></Link></Button><Button variant="ghost" onClick={() => logout()}><LogOut size={18} /><span className="hidden sm:inline">Salir</span></Button></>}
    >
      <div className="sm:hidden">
        <Select value={tab} onChange={(event) => setTab(event.target.value as Tab)} aria-label="Sección de administración">
          {tabs.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
      </div>
      <nav className="hidden gap-2 sm:flex">
        {tabs.map(([value, label]) => (
          <Button key={value} variant={tab === value ? "secondary" : "ghost"} onClick={() => setTab(value as Tab)}>{label}</Button>
        ))}
      </nav>
      {tab === "resumen" && <StatsPanel />}
      {tab === "usuarios" && <SearchUsersPanel />}
      {tab === "accesos" && <AccessLogsPanel />}
      {tab === "dentro" && <UsersInsidePanel />}
      {tab === "qr" && <AdminQRPanel />}
    </PageShell>
  );
}

function StatsPanel() {
  const query = useQuery({ queryKey: ["admin-stats"], queryFn: adminApi.stats });
  const stats = query.data;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Metric label="Usuarios totales" value={stats?.users_total} />
      <Metric label="Autorizados" value={stats?.users_authorized} />
      <Metric label="Pendientes" value={stats?.users_pending} />
      <Panel className="lg:col-span-3">
        <h2 className="mb-4 text-lg font-semibold">Usuarios por rol</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(stats?.users_by_role ?? {}).map(([role, count]) => (
            <div key={role} className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
              <RoleBadge role={role as Role} />
              <p className="mt-3 text-2xl font-bold">{count}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Metric({ label, value }: { label: string; value?: number }) {
  return (
    <Panel>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value ?? "..."}</p>
    </Panel>
  );
}

function SearchUsersPanel() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const pendingQuery = useQuery({ queryKey: ["users-tab-pending"], queryFn: () => adminApi.pending({ per_page: 50 }) });
  const authorizedQuery = useQuery({
    queryKey: ["search-users", "authorized", search, category],
    queryFn: () => adminApi.search({ search: search || undefined, category: category || undefined, authorization_status: "authorized", per_page: 50 })
  });
  const unauthorizedQuery = useQuery({
    queryKey: ["search-users", "unauthorized", search, category],
    queryFn: () => adminApi.search({ search: search || undefined, category: category || undefined, authorization_status: "unauthorized", per_page: 50 })
  });
  return (
    <div className="space-y-4">
      <Panel className="space-y-4 border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30">
        <div>
          <h2 className="text-lg font-semibold">Usuarios pendientes</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">Solicitudes que requieren primera autorización o rechazo.</p>
        </div>
        {pendingQuery.isLoading ? <p className="text-sm text-slate-500">Cargando pendientes...</p> : null}
        {!pendingQuery.isLoading && (pendingQuery.data?.users.length ?? 0) === 0 ? (
          <div className="rounded-md border border-dashed border-amber-300 bg-white p-4 text-sm font-medium text-slate-600 dark:border-amber-800 dark:bg-slate-900 dark:text-slate-300">
            Sin usuarios pendientes.
          </div>
        ) : (
          <UserTable users={pendingQuery.data?.users ?? []} />
        )}
      </Panel>

      <Panel className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Usuarios autorizados</h2>
          <p className="text-sm text-slate-500">Usuarios con acceso activo al sistema.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <Field><Label>Buscar</Label><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, apellidos o correo" /></Field>
          <Field><Label>Categoría</Label><Select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Todas</option>{PUBLIC_ROLES.map((item) => <option key={item} value={item}>{ROLE_LABELS[item]}</option>)}</Select></Field>
        </div>
        <UserTable users={authorizedQuery.data?.users ?? []} />
      </Panel>

      <Panel className="space-y-4 border-red-200 bg-red-50/60 dark:border-red-950 dark:bg-red-950/20">
        <div>
          <h2 className="text-lg font-semibold">Usuarios desautorizados</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">Usuarios sin acceso por QR. Sus datos se conservan para posible reautorización.</p>
        </div>
        <UserTable users={unauthorizedQuery.data?.users ?? []} />
      </Panel>
    </div>
  );
}

function UserTable({ users }: { users: User[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200/60 dark:border-slate-800">
      <table className="w-full min-w-[850px] text-left text-sm border-collapse">
        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-950/50 dark:border-slate-800">
          <tr>
            <th className="px-4 py-3">Usuario</th>
            <th className="px-4 py-3">Rol</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Registro</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {users.map((user) => <UserRow key={user.id} user={user} />)}
          {users.length === 0 ? (
            <tr>
              <td className="py-8 text-center text-slate-500" colSpan={5}>
                Sin usuarios para mostrar.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function UserRow({ user }: { user: User }) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [demoteRole, setDemoteRole] = useState<PublicRole>("voluntarios");
  const [showManual, setShowManual] = useState(false);
  const [showReason, setShowReason] = useState(false);
  const [showPromote, setShowPromote] = useState(false);
  const [showDemote, setShowDemote] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [identification, setIdentification] = useState(false);
  const [identificationUrl, setIdentificationUrl] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const identificationQuery = useQuery({
    queryKey: ["identification", user.id],
    queryFn: () => adminApi.identificationBlob(user.id),
    enabled: identification,
    retry: false
  });

  useEffect(() => {
    if (!identificationQuery.data) return;
    const nextUrl = URL.createObjectURL(identificationQuery.data);
    setIdentificationUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [identificationQuery.data]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["pending-users"] });
    void queryClient.invalidateQueries({ queryKey: ["users-tab-pending"] });
    void queryClient.invalidateQueries({ queryKey: ["search-users"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    void queryClient.invalidateQueries({ queryKey: ["users-inside"] });
    void queryClient.invalidateQueries({ queryKey: ["access-logs"] });
  };

  const authorize = useMutation({ mutationFn: () => adminApi.authorize(user.id), onSuccess: invalidate });
  const reject = useMutation({ mutationFn: () => adminApi.reject(user.id), onSuccess: invalidate });
  const promoteAdmin = useMutation({
    mutationFn: () => adminApi.promoteAdmin(user.id, adminPassword),
    onSuccess: () => {
      setShowPromote(false);
      setAdminPassword("");
      invalidate();
    }
  });
  const demoteAdmin = useMutation({
    mutationFn: () => adminApi.demoteAdmin(user.id, { password: adminPassword, role: demoteRole }),
    onSuccess: () => {
      setShowDemote(false);
      setAdminPassword("");
      invalidate();
    }
  });
  const resetPassword = useMutation({
    mutationFn: () => adminApi.resetPassword(user.id),
    onSuccess: (result) => {
      setTemporaryPassword(result.temporary_password);
      invalidate();
    }
  });
  const unauthorize = useMutation({ mutationFn: () => adminApi.unauthorize(user.id, reason), onSuccess: () => { setShowReason(false); setReason(""); invalidate(); } });
  const reauthorize = useMutation({ mutationFn: () => adminApi.reauthorize(user.id), onSuccess: invalidate });
  const manualAccess = useMutation({
    mutationFn: (access_type: "entry" | "exit") => adminApi.manualAccess(user.id, { access_type, notes: manualNotes || undefined }),
    onSuccess: () => {
      setShowManual(false);
      setManualNotes("");
      invalidate();
    }
  });

  const busy =
    authorize.isPending ||
    reject.isPending ||
    promoteAdmin.isPending ||
    demoteAdmin.isPending ||
    unauthorize.isPending ||
    reauthorize.isPending ||
    manualAccess.isPending ||
    resetPassword.isPending;

  const isPending = user.authorization_status === "pending";
  const isAuthorized = user.authorization_status === "authorized";
  const isSelf = currentUser?.id === user.id;

  const canPromoteAdmin = Boolean(currentUser?.role === "admin" && user.role !== "admin" && isAuthorized && !isSelf);
  const canDemoteAdmin = Boolean(currentUser?.is_super_admin && user.role === "admin" && !user.is_super_admin && !isSelf);
  const canResetPassword = Boolean(currentUser?.role === "admin" && user.role !== "admin" && !user.is_super_admin && !isSelf);

  const hasExtraActions = isAuthorized || canPromoteAdmin || canDemoteAdmin || canResetPassword;

  return (
    <>
      <tr className={`hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors ${showDropdown ? "relative z-30" : ""}`}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar user={user} className="h-10 w-10 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 dark:text-white break-words">{user.nombre_completo} {user.apellidos}</p>
              <p className="break-all text-xs text-slate-500">{user.email}</p>
              <p className="text-xs text-slate-400 mt-0.5">{user.telefono} · {user.edad} años</p>
              <p className="max-w-md truncate text-xs text-slate-400" title={user.direccion}>{user.direccion}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 align-middle"><RoleBadge role={user.role} /></td>
        <td className="px-4 py-3 align-middle">
          <div className="space-y-1">
            <StatusBadge status={user.authorization_status} />
            <p className="text-xs font-semibold text-slate-500">{user.access_status === "in" ? "Dentro" : "Fuera"}</p>
            {user.last_access_log ? (
              <p className="text-[10px] text-slate-400 leading-tight">
                Último: {user.last_access_log.access_type === "entry" ? "Entrada" : "Salida"} · {formatDate(user.last_access_log.timestamp)}
              </p>
            ) : null}
          </div>
        </td>
        <td className="px-4 py-3 align-middle text-slate-500 text-xs">{formatDate(user.created_at)}</td>
        <td className={`px-4 py-3 align-middle text-right ${showDropdown ? "relative z-30" : ""}`}>
          <div className="flex items-center justify-end gap-1.5">
            {/* Common primary action: View ID */}
            <Button size="sm" variant="ghost" onClick={() => setIdentification((value) => !value)} title="Ver identificación">
              <Eye size={15} />
              <span>ID</span>
            </Button>

            {/* Pending flow actions */}
            {isPending && (
              <>
                <Button size="sm" variant="success" disabled={busy} onClick={() => authorize.mutate()} title="Autorizar">
                  <Check size={15} />
                  <span>Autorizar</span>
                </Button>
                <Button size="sm" variant="danger" disabled={busy} onClick={() => reject.mutate()} title="Rechazar">
                  <UserX size={15} />
                  <span>Rechazar</span>
                </Button>
              </>
            )}

            {/* Reauthorize action for unauthorized users */}
            {user.authorization_status === "unauthorized" && (
              <Button size="sm" variant="success" disabled={busy} onClick={() => reauthorize.mutate()} title="Reautorizar">
                <ShieldPlus size={15} />
                <span>Reautorizar</span>
              </Button>
            )}

            {/* Administrative / Secondary actions dropdown */}
            {hasExtraActions && (
              <div className="relative">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="px-2"
                  title="Más acciones"
                >
                  <MoreVertical size={15} />
                </Button>
                {showDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                    <div className="absolute right-0 mt-1 w-48 rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900 focus:outline-none z-20 py-1 text-left">
                      {isAuthorized && (
                        <button
                          onClick={() => {
                            setShowDropdown(false);
                            setShowManual((value) => !value);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <LogIn size={14} />
                          Acceso admin
                        </button>
                      )}
                      {canPromoteAdmin && (
                        <button
                          onClick={() => {
                            setShowDropdown(false);
                            setShowDemote(false);
                            setShowPromote((value) => !value);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <UserCog size={14} />
                          Hacer admin
                        </button>
                      )}
                      {canDemoteAdmin && (
                        <button
                          onClick={() => {
                            setShowDropdown(false);
                            setShowPromote(false);
                            setShowDemote((value) => !value);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          <UserMinus size={14} />
                          Quitar admin
                        </button>
                      )}
                      {canResetPassword && (
                        <button
                          onClick={() => {
                            setShowDropdown(false);
                            resetPassword.mutate();
                          }}
                          disabled={busy}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 disabled:opacity-50"
                        >
                          <KeyRound size={14} />
                          Recuperar contraseña
                        </button>
                      )}
                      {isAuthorized && (
                        <button
                          onClick={() => {
                            setShowDropdown(false);
                            setShowReason((value) => !value);
                          }}
                          className="flex w-full items-center gap-2 border-t border-slate-105 dark:border-slate-800 px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          <ShieldMinus size={14} />
                          Desautorizar
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          {temporaryPassword ? (
            <p className="mt-2 inline-block rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              Temporal: {temporaryPassword}
            </p>
          ) : null}
          {[authorize.error, reject.error, promoteAdmin.error, demoteAdmin.error, unauthorize.error, reauthorize.error, manualAccess.error, resetPassword.error].find(Boolean) ? (
            <p className="mt-2 text-xs text-red-600">
              {apiErrorMessage(authorize.error ?? reject.error ?? promoteAdmin.error ?? demoteAdmin.error ?? unauthorize.error ?? reauthorize.error ?? manualAccess.error ?? resetPassword.error)}
            </p>
          ) : null}
        </td>
      </tr>

      {/* Expanded sub-forms */}
      {showPromote && canPromoteAdmin ? (
        <tr className="bg-slate-50/50 dark:bg-slate-900/30">
          <td colSpan={5} className="px-6 py-4 border-t border-b border-slate-200/50 dark:border-slate-800">
            <div className="max-w-2xl space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Promover a Administrador</h4>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Input type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="Confirma tu contraseña de administrador" autoComplete="current-password" />
                <Button size="sm" variant="secondary" disabled={busy || adminPassword.length < 12} onClick={() => promoteAdmin.mutate()}>Confirmar admin</Button>
              </div>
              <p className="text-xs text-slate-500">Solo un administrador autorizado y logueado puede asignar permisos de administrador (mínimo 12 caracteres).</p>
            </div>
          </td>
        </tr>
      ) : null}

      {showDemote && canDemoteAdmin ? (
        <tr className="bg-slate-50/50 dark:bg-slate-900/30">
          <td colSpan={5} className="px-6 py-4 border-t border-b border-slate-200/50 dark:border-slate-800">
            <div className="max-w-2xl space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Quitar permisos de Administrador</h4>
              <div className="grid gap-2 sm:grid-cols-[1fr_200px_auto]">
                <Input type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="Confirma tu contraseña de superadmin" autoComplete="current-password" />
                <Select value={demoteRole} onChange={(event) => setDemoteRole(event.target.value as PublicRole)}>
                  {PUBLIC_ROLES.map((item) => <option key={item} value={item}>{ROLE_LABELS[item]}</option>)}
                </Select>
                <Button size="sm" variant="danger" disabled={busy || adminPassword.length < 12} onClick={() => demoteAdmin.mutate()}>Quitar admin</Button>
              </div>
              <p className="text-xs text-slate-500">Solo José Pablo Hernández Alonso como superadmin puede quitar permisos de administrador.</p>
            </div>
          </td>
        </tr>
      ) : null}

      {showManual && isAuthorized ? (
        <tr className="bg-slate-50/50 dark:bg-slate-900/30">
          <td colSpan={5} className="px-6 py-4 border-t border-b border-slate-200/50 dark:border-slate-800">
            <div className="max-w-2xl space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Registrar Acceso Manual</h4>
              <div className="space-y-2">
                <Textarea value={manualNotes} onChange={(event) => setManualNotes(event.target.value)} placeholder="Nota para el registro manual (motivo de acceso sin QR, etc.)" className="min-h-[60px]" />
                <div className="flex gap-2">
                  <Button size="sm" variant="success" disabled={busy || user.access_status === "in"} onClick={() => manualAccess.mutate("entry")}>
                    Registrar Entrada
                  </Button>
                  <Button size="sm" variant="danger" disabled={busy || user.access_status === "out"} onClick={() => manualAccess.mutate("exit")}>
                    Registrar Salida
                  </Button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      ) : null}

      {showReason ? (
        <tr className="bg-slate-50/50 dark:bg-slate-900/30">
          <td colSpan={5} className="px-6 py-4 border-t border-b border-slate-200/50 dark:border-slate-800">
            <div className="max-w-2xl space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Motivo de Desautorización</h4>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Describe el motivo (mínimo 10 caracteres)" className="min-h-[60px]" />
                <div className="flex items-end">
                  <Button size="sm" variant="danger" disabled={reason.length < 10 || busy} onClick={() => unauthorize.mutate()}>
                    Confirmar desautorización
                  </Button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      ) : null}

      {identification ? (
        <tr className="bg-slate-50/50 dark:bg-slate-900/30">
          <td colSpan={5} className="px-6 py-4 border-t border-b border-slate-200/50 dark:border-slate-800">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Documento de Identificación</h4>
              {identificationQuery.isLoading ? <p className="text-sm text-slate-500">Cargando identificación...</p> : null}
              {identificationQuery.error ? <p className="text-sm text-red-600">{apiErrorMessage(identificationQuery.error)}</p> : null}
              {identificationUrl ? (
                <div className="mt-2">
                  <img src={identificationUrl} alt={`Identificación de ${user.nombre_completo}`} className="max-h-96 rounded-md border border-slate-200 bg-white object-contain shadow-sm dark:border-slate-800 dark:bg-slate-950" />
                </div>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function AccessLogsPanel() {
  const today = new Date().toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [role, setRole] = useState("");
  const [accessType, setAccessType] = useState<"" | "entry" | "exit">("");
  const filters = { date_from: dateFrom, date_to: dateTo, role, access_type: accessType };
  const query = useQuery({ queryKey: ["access-logs", filters], queryFn: () => adminApi.accessLogs({ ...filters, per_page: 100 }) });
  function openCsv() {
    window.open(adminApi.accessLogsCsvUrl({ ...filters, include_pending: "true" }), "_blank", "noopener,noreferrer");
  }
  return (
    <Panel className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_170px_170px_190px_150px_auto]">
        <div>
          <h2 className="text-lg font-semibold">Logs de acceso</h2>
          <p className="text-sm text-slate-500">Entradas: {query.data?.total_entries ?? 0} · Salidas: {query.data?.total_exits ?? 0} · Dentro: {query.data?.currently_inside ?? 0}</p>
        </div>
        <Field><Label>Desde</Label><Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></Field>
        <Field><Label>Hasta</Label><Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></Field>
        <Field><Label>Tipo de cuenta</Label><Select value={role} onChange={(event) => setRole(event.target.value)}><option value="">Todas</option>{PUBLIC_ROLES.map((item) => <option key={item} value={item}>{ROLE_LABELS[item]}</option>)}</Select></Field>
        <Field><Label>Acceso</Label><Select value={accessType} onChange={(event) => setAccessType(event.target.value as "" | "entry" | "exit")}><option value="">Todos</option><option value="entry">Entrada</option><option value="exit">Salida</option></Select></Field>
        <div className="flex items-end"><Button size="sm" variant="secondary" onClick={openCsv}><Download size={18} /> CSV</Button></div>
      </div>
      <div className="overflow-x-auto rounded-md border border-slate-200/60 dark:border-slate-800">
        <table className="w-full min-w-[760px] text-left text-sm border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-950/50 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Hora</th>
              <th className="px-4 py-3">Manual</th>
              <th className="px-4 py-3">Notas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {(query.data?.logs ?? []).map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900 dark:text-white">{log.user_name}</p>
                  <p className="text-xs text-slate-500">{log.user_email}</p>
                </td>
                <td className="px-4 py-3 align-middle">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${log.access_type === "entry" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"}`}>
                    {log.access_type === "entry" ? "Entrada" : "Salida"}
                  </span>
                </td>
                <td className="px-4 py-3 align-middle text-slate-500 text-xs">{formatDate(log.timestamp)}</td>
                <td className="px-4 py-3 align-middle">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${log.is_manual ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-205"}`}>
                    {log.is_manual ? "Sí" : "No"}
                  </span>
                </td>
                <td className="px-4 py-3 align-middle text-slate-600 dark:text-slate-300 text-xs max-w-xs truncate" title={log.notes ?? ""}>{log.notes ?? "-"}</td>
              </tr>
            ))}
            {(query.data?.logs ?? []).length === 0 ? (
              <tr>
                <td className="py-8 text-center text-slate-500" colSpan={5}>
                  Sin logs de acceso para mostrar.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function UsersInsidePanel() {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const query = useQuery({ queryKey: ["users-inside"], queryFn: adminApi.usersInside, refetchInterval: 30_000 });
  const exit = useMutation({
    mutationFn: (id: string) => adminApi.manualExit(id, notes || undefined),
    onSuccess: () => {
      setNotes("");
      void queryClient.invalidateQueries({ queryKey: ["users-inside"] });
      void queryClient.invalidateQueries({ queryKey: ["access-logs"] });
    }
  });
  return (
    <Panel className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Usuarios dentro</h2>
          <p className="text-sm text-slate-500">{query.data?.length ?? 0} personas con entrada abierta.</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => void query.refetch()}><Search size={16} /> Actualizar</Button>
      </div>
      <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notas para salida manual" className="min-h-[60px]" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(query.data ?? []).map((user) => (
          <div key={user.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 shadow-sm dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div className="min-w-0 flex items-center gap-2.5">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate text-slate-900 dark:text-white">{user.nombre_completo} {user.apellidos}</p>
                <p className="text-xs text-slate-400 truncate">{ROLE_LABELS[user.role]} · {formatDate(user.entry_time)}</p>
              </div>
            </div>
            <Button size="sm" variant="danger" disabled={exit.isPending} onClick={() => exit.mutate(user.id)}>Salida</Button>
          </div>
        ))}
        {(query.data ?? []).length === 0 ? (
          <div className="col-span-full py-8 text-center text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            No hay usuarios dentro en este momento.
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
