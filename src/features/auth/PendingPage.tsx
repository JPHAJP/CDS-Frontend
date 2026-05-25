import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { AuthShell } from "../../components/ui/Shell";
import { Button } from "../../components/ui/Button";

export function PendingPage() {
  return (
    <AuthShell>
      <div className="mx-auto max-w-md space-y-5 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-amber-700">
          <Clock size={28} />
        </div>
        <h2 className="text-2xl font-bold text-slate-950 dark:text-white">Cuenta pendiente</h2>
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Tu registro fue recibido. Un administrador revisara tu informacion e identificacion antes de autorizar el acceso.</p>
        <Button variant="secondary" className="w-full" onClick={() => undefined}>
          <Link to="/login" className="w-full">Volver al inicio</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
