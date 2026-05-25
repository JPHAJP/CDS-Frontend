import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, Eye, LogIn, LogOut, Search, ShieldMinus, ShieldPlus, UserCog, UserMinus, UserRound, UserX } from "lucide-react";
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
      title="Administracion"
      subtitle="Usuarios, autorizaciones y control de acceso"
      user={user}
      actions={<><ThemeToggle dark={dark} onToggle={onToggleTheme} /><Button variant="ghost"><Link to="/perfil" className="inline-flex items-center gap-2"><UserRound size={18} /><span className="hidden sm:inline">Perfil</span></Link></Button><Button variant="ghost" onClick={() => logout()}><LogOut size={18} /><span className="hidden sm:inline">Salir</span></Button></>}
    >
      <div className="sm:hidden">
        <Select value={tab} onChange={(event) => setTab(event.target.value as Tab)} aria-label="Seccion de administracion">
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
          <p className="text-sm text-slate-600 dark:text-slate-300">Solicitudes que requieren primera autorizacion o rechazo.</p>
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
          <Field><Label>Categoria</Label><Select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Todas</option>{PUBLIC_ROLES.map((item) => <option key={item} value={item}>{ROLE_LABELS[item]}</option>)}</Select></Field>
        </div>
        <UserTable users={authorizedQuery.data?.users ?? []} />
      </Panel>

      <Panel className="space-y-4 border-red-200 bg-red-50/60 dark:border-red-950 dark:bg-red-950/20">
        <div>
          <h2 className="text-lg font-semibold">Usuarios desautorizados</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">Usuarios sin acceso por QR. Sus datos se conservan para posible reautorizacion.</p>
        </div>
        <UserTable users={unauthorizedQuery.data?.users ?? []} />
      </Panel>
    </div>
  );
}

function UserTable({ users }: { users: User[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
          <tr><th className="py-3">Usuario</th><th>Rol</th><th>Estado</th><th>Registro</th><th>Acciones</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {users.map((user) => <UserRow key={user.id} user={user} />)}
          {users.length === 0 ? <tr><td className="py-8 text-center text-slate-500" colSpan={5}>Sin usuarios para mostrar.</td></tr> : null}
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
  const [identification, setIdentification] = useState(false);
  const [identificationUrl, setIdentificationUrl] = useState("");
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
  const busy = authorize.isPending || reject.isPending || promoteAdmin.isPending || demoteAdmin.isPending || unauthorize.isPending || reauthorize.isPending || manualAccess.isPending;
  const isPending = user.authorization_status === "pending";
  const isAuthorized = user.authorization_status === "authorized";
  const isSelf = currentUser?.id === user.id;
  const canPromoteAdmin = Boolean(currentUser?.role === "admin" && user.role !== "admin" && isAuthorized && !isSelf);
  const canDemoteAdmin = Boolean(currentUser?.is_super_admin && user.role === "admin" && !user.is_super_admin && !isSelf);
  return (
    <>
      <tr>
        <td className="py-3">
          <div className="flex items-center gap-3">
            <Avatar user={user} className="h-10 w-10" />
            <div className="min-w-0">
              <p className="break-words font-semibold">{user.nombre_completo} {user.apellidos}</p>
              <p className="break-all text-xs text-slate-500">{user.email}</p>
              <p className="text-xs text-slate-500">{user.telefono} · {user.edad} años</p>
              <p className="max-w-md break-words text-xs text-slate-500">{user.direccion}</p>
            </div>
          </div>
        </td>
        <td><RoleBadge role={user.role} /></td>
        <td>
          <div className="space-y-1">
            <StatusBadge status={user.authorization_status} />
            <p className="text-xs font-semibold text-slate-500">{user.access_status === "in" ? "Dentro" : "Fuera"}</p>
            {user.last_access_log ? <p className="text-xs text-slate-500">Ultimo: {user.last_access_log.access_type === "entry" ? "Entrada" : "Salida"} · {formatDate(user.last_access_log.timestamp)}</p> : null}
          </div>
        </td>
        <td>{formatDate(user.created_at)}</td>
        <td>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setIdentification((value) => !value)}><Eye size={16} /> ID</Button>
            {isPending ? <Button variant="success" disabled={busy} onClick={() => authorize.mutate()}><Check size={16} /> Autorizar</Button> : null}
            {isPending ? <Button variant="danger" disabled={busy} onClick={() => reject.mutate()}><UserX size={16} /> Rechazar</Button> : null}
            {isAuthorized ? <Button variant="danger" disabled={busy} onClick={() => setShowReason((value) => !value)}><ShieldMinus size={16} /> Desautorizar</Button> : null}
            {user.authorization_status === "unauthorized" ? <Button variant="success" disabled={busy} onClick={() => reauthorize.mutate()}><ShieldPlus size={16} /> Reautorizar</Button> : null}
            {isAuthorized ? <Button variant="ghost" disabled={busy} onClick={() => setShowManual((value) => !value)}><LogIn size={16} /> Acceso admin</Button> : null}
            {canPromoteAdmin ? <Button variant="secondary" disabled={busy} onClick={() => { setShowDemote(false); setShowPromote((value) => !value); }}><UserCog size={16} /> Hacer admin</Button> : null}
            {canDemoteAdmin ? <Button variant="danger" disabled={busy} onClick={() => { setShowPromote(false); setShowDemote((value) => !value); }}><UserMinus size={16} /> Quitar admin</Button> : null}
          </div>
          {[authorize.error, reject.error, promoteAdmin.error, demoteAdmin.error, unauthorize.error, reauthorize.error, manualAccess.error].find(Boolean) ? <p className="mt-2 text-xs text-red-600">{apiErrorMessage(authorize.error ?? reject.error ?? promoteAdmin.error ?? demoteAdmin.error ?? unauthorize.error ?? reauthorize.error ?? manualAccess.error)}</p> : null}
        </td>
      </tr>
      {showPromote && canPromoteAdmin ? (
        <tr>
          <td colSpan={5} className="bg-slate-50 p-3 dark:bg-slate-950">
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <Input type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="Confirma tu contrasena de administrador" autoComplete="current-password" />
              <Button variant="secondary" disabled={busy || adminPassword.length < 12} onClick={() => promoteAdmin.mutate()}>Confirmar admin</Button>
            </div>
            <p className="mt-2 text-xs text-slate-500">Solo un administrador autorizado y logeado puede asignar permisos admin.</p>
          </td>
        </tr>
      ) : null}
      {showDemote && canDemoteAdmin ? (
        <tr>
          <td colSpan={5} className="bg-slate-50 p-3 dark:bg-slate-950">
            <div className="grid gap-2 md:grid-cols-[1fr_220px_auto]">
              <Input type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="Confirma tu contrasena de superadmin" autoComplete="current-password" />
              <Select value={demoteRole} onChange={(event) => setDemoteRole(event.target.value as PublicRole)}>{PUBLIC_ROLES.map((item) => <option key={item} value={item}>{ROLE_LABELS[item]}</option>)}</Select>
              <Button variant="danger" disabled={busy || adminPassword.length < 12} onClick={() => demoteAdmin.mutate()}>Quitar admin</Button>
            </div>
            <p className="mt-2 text-xs text-slate-500">Solo José Pablo Hernández Alonso como superadmin puede quitar permisos admin.</p>
          </td>
        </tr>
      ) : null}
      {showManual && isAuthorized ? (
        <tr>
          <td colSpan={5} className="bg-slate-50 p-3 dark:bg-slate-950">
            <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
              <Textarea value={manualNotes} onChange={(event) => setManualNotes(event.target.value)} placeholder="Nota para registro manual por administrador" />
              <Button variant="success" disabled={busy || user.access_status === "in"} onClick={() => manualAccess.mutate("entry")}>Registrar entrada</Button>
              <Button variant="danger" disabled={busy || user.access_status === "out"} onClick={() => manualAccess.mutate("exit")}>Registrar salida</Button>
            </div>
          </td>
        </tr>
      ) : null}
      {showReason ? (
        <tr><td colSpan={5} className="bg-slate-50 p-3 dark:bg-slate-950"><div className="grid gap-2 md:grid-cols-[1fr_auto]"><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo de desautorizacion, minimo 10 caracteres" /><Button variant="danger" disabled={reason.length < 10 || busy} onClick={() => unauthorize.mutate()}>Confirmar</Button></div></td></tr>
      ) : null}
      {identification ? (
        <tr>
          <td colSpan={5} className="bg-slate-50 p-3 dark:bg-slate-950">
            {identificationQuery.isLoading ? <p className="text-sm text-slate-500">Cargando identificacion...</p> : null}
            {identificationQuery.error ? <p className="text-sm text-red-600">{apiErrorMessage(identificationQuery.error)}</p> : null}
            {identificationUrl ? <img src={identificationUrl} alt={`Identificacion de ${user.nombre_completo}`} className="max-h-96 rounded-md border border-slate-200 bg-white object-contain" /> : null}
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
        <div className="flex items-end"><Button variant="secondary" onClick={openCsv}><Download size={18} /> CSV</Button></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr><th className="py-3">Usuario</th><th>Tipo</th><th>Hora</th><th>Manual</th><th>Notas</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {(query.data?.logs ?? []).map((log) => <tr key={log.id}><td className="py-3"><p className="font-medium">{log.user_name}</p><p className="text-xs text-slate-500">{log.user_email}</p></td><td>{log.access_type === "entry" ? "Entrada" : "Salida"}</td><td>{formatDate(log.timestamp)}</td><td>{log.is_manual ? "Si" : "No"}</td><td>{log.notes ?? "-"}</td></tr>)}
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
        <div><h2 className="text-lg font-semibold">Usuarios dentro</h2><p className="text-sm text-slate-500">{query.data?.length ?? 0} personas con entrada abierta.</p></div>
        <Button variant="ghost" onClick={() => void query.refetch()}><Search size={18} /> Actualizar</Button>
      </div>
      <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notas para salida manual" />
      <div className="grid gap-3 md:grid-cols-2">
        {(query.data ?? []).map((user) => (
          <div key={user.id} className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div><p className="font-semibold">{user.nombre_completo} {user.apellidos}</p><p className="text-sm text-slate-500">{ROLE_LABELS[user.role]} · {formatDate(user.entry_time)}</p></div>
              <Button variant="danger" disabled={exit.isPending} onClick={() => exit.mutate(user.id)}>Salida</Button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
