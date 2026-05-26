import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type ChangeEvent } from "react";
import { BadgeCheck, Clock, LogIn, LogOut, QrCode, ShieldAlert, UserRound } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { RoleBadge, StatusBadge } from "../../components/ui/Badge";
import { Field, Input, Label } from "../../components/ui/Form";
import { Avatar, PageShell, Panel, ThemeToggle } from "../../components/ui/Shell";
import { apiErrorMessage, authApi } from "../../lib/api";
import { formatDate } from "../../lib/format";
import { useAuth } from "../auth/auth-context";

export function DashboardPage({ dark, onToggleTheme }: { dark: boolean; onToggleTheme: () => void }) {
  const { user, logout } = useAuth();
  if (!user) return null;
  const blocked = user.authorization_status === "unauthorized";
  const lastLog = user.last_access_log;
  return (
    <PageShell
      title={`Hola, ${user.nombre_completo}`}
      subtitle="Panel de usuario"
      user={user}
      actions={<><ThemeToggle dark={dark} onToggle={onToggleTheme} /><Button variant="ghost"><Link to="/perfil" className="inline-flex items-center gap-2"><UserRound size={18} /><span className="hidden sm:inline">Perfil</span></Link></Button><Button variant="ghost" onClick={() => logout()}><LogOut size={18} /><span className="hidden sm:inline">Salir</span></Button></>}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Panel className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={user.authorization_status} />
            <RoleBadge role={user.role} />
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.access_status === "in" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
              {user.access_status === "in" ? "Dentro" : "Fuera"}
            </span>
          </div>
          <h2 className="text-xl font-semibold">Estado de acceso</h2>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{user.authorization_info}</p>
          {blocked ? (
            <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              <ShieldAlert size={20} /> Tu cuenta no puede registrar entradas o salidas hasta ser reautorizada.
            </div>
          ) : (
            <Button className="w-full sm:w-auto" onClick={() => undefined}>
              <Link to="/qr" className="inline-flex items-center gap-2"><QrCode size={18} /> Registrar entrada o salida</Link>
            </Button>
          )}
        </Panel>
        <Panel className="space-y-3">
          <h2 className="flex items-center gap-2 text-xl font-semibold"><UserRound size={20} /> Resumen</h2>
          <Info label="Correo" value={user.email} />
          <Info label="Telefono" value={user.telefono} />
          <Info label="Registro" value={formatDate(user.created_at)} />
          <Info label="Autorizacion" value={formatDate(user.authorized_at)} />
          <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
            <p className="flex items-center gap-2 text-sm font-semibold">
              {lastLog?.access_type === "entry" ? <LogIn size={16} /> : <LogOut size={16} />}
              Ultimo registro
            </p>
            {lastLog ? (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {lastLog.access_type === "entry" ? "Entrada" : "Salida"} · {formatDate(lastLog.timestamp)}
                {lastLog.is_manual && lastLog.manual_by_admin_name ? ` · Registrado por ${lastLog.manual_by_admin_name}` : ""}
              </p>
            ) : (
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><Clock size={14} /> Sin registros todavia</p>
            )}
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}

export function ProfilePage({ dark, onToggleTheme }: { dark: boolean; onToggleTheme: () => void }) {
  const { user, logout, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [localError, setLocalError] = useState("");
  const [success, setSuccess] = useState("");
  const uploadPhoto = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.set("foto_perfil", file);
      return authApi.uploadProfilePhoto(form);
    },
    onSuccess: async (updated) => {
      setLocalError("");
      setSuccess("Foto de perfil actualizada.");
      queryClient.setQueryData(["profile"], updated);
      await refreshProfile();
    },
    onError: (error) => {
      setSuccess("");
      setLocalError(apiErrorMessage(error));
    }
  });
  if (!user) return null;

  function onPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setLocalError("");
    setSuccess("");
    if (!file) return;
    const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      setLocalError("Formato no valido. Usa PNG, JPG, JPEG o WEBP.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLocalError("La foto no debe superar 5MB.");
      event.target.value = "";
      return;
    }
    uploadPhoto.mutate(file);
  }

  return (
    <PageShell
      title="Perfil"
      subtitle="Datos registrados"
      user={user}
      actions={<><ThemeToggle dark={dark} onToggle={onToggleTheme} /><Button variant="ghost" onClick={() => logout()}><LogOut size={18} /><span className="hidden sm:inline">Salir</span></Button></>}
    >
      <Panel className="grid gap-5 md:grid-cols-[260px_1fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-4 md:block md:space-y-3">
            <Avatar user={user} className="h-20 w-20 md:h-28 md:w-28" />
            <div className="min-w-0">
              <p className="break-words font-semibold">{user.nombre_completo} {user.apellidos}</p>
              <p className="break-all text-sm text-slate-500">{user.email}</p>
            </div>
          </div>
          {user.authorization_status === "authorized" ? (
            <Field>
              <Label htmlFor="foto_perfil">Foto de perfil</Label>
              <Input id="foto_perfil" type="file" accept="image/png,image/jpeg,image/webp" onChange={onPhotoChange} disabled={uploadPhoto.isPending} />
              <p className="text-xs text-slate-500">PNG, JPG, JPEG o WEBP. Maximo 5MB.</p>
            </Field>
          ) : (
            <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">La foto de perfil se habilita cuando tu cuenta esta autorizada.</p>
          )}
          {localError ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{localError}</p> : null}
          {success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p> : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
        <Info label="Nombre" value={`${user.nombre_completo} ${user.apellidos}`} />
        <Info label="Correo" value={user.email} />
        <Info label="Direccion" value={user.direccion} />
        <Info label="Edad" value={`${user.edad} años`} />
        <Info label="Telefono" value={user.telefono} />
        <div><p className="text-xs text-slate-500">Estado</p><div className="mt-1"><StatusBadge status={user.authorization_status} /></div></div>
        <div className="md:col-span-2">
          <p className="mb-2 text-xs text-slate-500">Acciones</p>
          <div className="flex flex-wrap gap-2">
            {user.role === "admin" && user.authorization_status === "authorized" ? (
              <Button variant="secondary"><Link to="/admin" className="inline-flex items-center gap-2"><BadgeCheck size={18} /> Dashboard</Link></Button>
            ) : null}
            {user.is_authorized ? <Button><Link to="/qr" className="inline-flex items-center gap-2"><QrCode size={18} /> QR</Link></Button> : null}
          </div>
        </div>
        </div>
      </Panel>
    </PageShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}
