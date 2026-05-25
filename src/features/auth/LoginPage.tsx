import { Link, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AuthShell } from "../../components/ui/Shell";
import { Button } from "../../components/ui/Button";
import { Field, Input, Label } from "../../components/ui/Form";
import { useAuth } from "./auth-context";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalError("");
    if (!/\S+@\S+\.\S+/.test(email)) {
      setLocalError("Ingresa un correo valido.");
      return;
    }
    if (password.length < 12) {
      setLocalError("La contraseña debe tener al menos 12 caracteres.");
      return;
    }
    try {
      const user = await login(email, password);
      if (user.role === "admin" && user.authorization_status === "authorized") navigate("/admin");
      else if (user.authorization_status === "pending") navigate("/pendiente");
      else if (user.is_authorized) navigate("/qr");
      else navigate("/dashboard");
    } catch {
      // El mensaje visible lo gestiona AuthProvider.
    }
  }

  return (
    <AuthShell>
      <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-950 dark:text-white">Iniciar sesion</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Usa tus credenciales registradas en Casa del Sol.</p>
        </div>
        {(localError || error) && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{localError || error}</div>}
        <Field>
          <Label htmlFor="email">Correo electronico</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </Field>
        <Field>
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={12} />
        </Field>
        <Button className="w-full" disabled={loading}>
          <LogIn size={18} /> Entrar
        </Button>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          ¿No tienes cuenta? <Link className="font-semibold text-casa-cyan" to="/registro">Registrate</Link>
        </p>
      </form>
    </AuthShell>
  );
}
