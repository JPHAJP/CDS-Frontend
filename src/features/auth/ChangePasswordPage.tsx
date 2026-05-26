import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { AuthShell } from "../../components/ui/Shell";
import { Button } from "../../components/ui/Button";
import { Field, Input, Label } from "../../components/ui/Form";
import { useAuth } from "./auth-context";

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, changePassword, loading, error } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalError("");
    if (newPassword.length < 12) {
      setLocalError("La nueva contrasena debe tener al menos 12 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError("La confirmacion de contrasena no coincide.");
      return;
    }
    try {
      const updatedUser = await changePassword(currentPassword, newPassword);
      if (updatedUser.role === "admin" && updatedUser.authorization_status === "authorized") navigate("/admin", { replace: true });
      else if (updatedUser.is_authorized) navigate("/qr", { replace: true });
      else navigate("/dashboard", { replace: true });
    } catch {
      // El mensaje visible lo gestiona AuthProvider.
    }
  }

  if (!user) return null;

  return (
    <AuthShell>
      <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-950 dark:text-white">Cambiar contrasena</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Debes actualizar tu contrasena temporal para continuar.</p>
        </div>
        {(localError || error) && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{localError || error}</div>}
        <Field>
          <Label htmlFor="current_password">Contrasena actual</Label>
          <Input id="current_password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required minLength={12} />
        </Field>
        <Field>
          <Label htmlFor="new_password">Nueva contrasena</Label>
          <Input id="new_password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={12} />
        </Field>
        <Field>
          <Label htmlFor="confirm_password">Confirmar nueva contrasena</Label>
          <Input id="confirm_password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={12} />
        </Field>
        <Button className="w-full" disabled={loading}>
          <KeyRound size={18} /> Guardar y continuar
        </Button>
      </form>
    </AuthShell>
  );
}
