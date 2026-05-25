import { Moon, Sun } from "lucide-react";
import type { PropsWithChildren, ReactNode } from "react";
import logo from "../../assets/LogoCasaDelSol2-980x493.png";
import { apiAssetUrl } from "../../lib/api";
import { initials } from "../../lib/format";
import type { User } from "../../types/api";
import { Button } from "./Button";

export function AuthShell({ children }: PropsWithChildren) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-4 dark:bg-slate-950">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-soft dark:bg-slate-900 md:grid-cols-[0.85fr_1.15fr]">
        <div className="flex min-h-72 flex-col justify-between bg-casa-ink p-8 text-white">
          <img src={logo} alt="Casa del Sol" className="h-auto w-full max-w-[260px] rounded bg-white/95 p-3 object-contain sm:max-w-[320px]" />
          <div>
            <h1 className="text-3xl font-bold">Control de acceso</h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-200">Autorizaciones y registro QR para colaboradores y visitantes.</p>
          </div>
        </div>
        <div className="p-6 sm:p-8">{children}</div>
      </section>
    </main>
  );
}

export function PageShell({
  children,
  title,
  subtitle,
  actions,
  user
}: PropsWithChildren<{ title: string; subtitle?: string; actions?: ReactNode; user?: User | null }>) {
  const fullName = user ? `${user.nombre_completo} ${user.apellidos}` : "";
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="relative rounded-lg border border-slate-200 bg-white p-4 pr-36 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:pr-4">
          <div className="min-w-0 space-y-3 sm:flex sm:items-center sm:gap-4 sm:space-y-0">
            <img src={logo} alt="Casa del Sol" className="h-auto w-auto max-w-[150px] object-contain sm:max-w-[230px] lg:max-w-[260px]" />
            <div className="min-w-0">
              <h1 className="break-words text-xl font-bold leading-tight sm:text-2xl">{title}</h1>
              {subtitle ? <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
            </div>
            {user ? (
              <div className="flex min-w-0 items-center gap-3 border-t border-slate-100 pt-3 dark:border-slate-800 sm:hidden">
                <Avatar user={user} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{fullName}</p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
              </div>
            ) : null}
          </div>
          <div className="absolute right-3 top-3 flex items-center gap-1 sm:static sm:flex-wrap sm:gap-2">{actions}</div>
        </header>
        {children}
      </div>
    </main>
  );
}

export function Avatar({ user, className = "" }: { user: User; className?: string }) {
  const fullName = `${user.nombre_completo} ${user.apellidos}`;
  return user.profile_photo_url ? (
    <img src={apiAssetUrl(user.profile_photo_url)} alt={`Foto de ${fullName}`} className={`h-11 w-11 shrink-0 rounded-full border border-slate-200 object-cover dark:border-slate-700 ${className}`} />
  ) : (
    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-950 ${className}`}>
      {initials(user.nombre_completo, user.apellidos)}
    </div>
  );
}

export function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <Button variant="ghost" onClick={onToggle} aria-label="Cambiar tema" title="Cambiar tema">
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </Button>
  );
}

export function Panel({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return <section className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>{children}</section>;
}
