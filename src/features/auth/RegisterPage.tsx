import { Link, useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AuthShell } from "../../components/ui/Shell";
import { Button } from "../../components/ui/Button";
import { Field, Input, Label, Select } from "../../components/ui/Form";
import { PUBLIC_ROLES, ROLE_LABELS } from "../../lib/constants";
import type { PublicRole } from "../../types/api";
import { useAuth } from "./auth-context";

const initial = {
  email: "",
  password: "",
  nombre_completo: "",
  apellidos: "",
  direccion: "",
  edad: "",
  telefono: "",
  role: "voluntarios" as PublicRole,
  foto_identificacion: null as File | null
};

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, loading, error } = useAuth();
  const [form, setForm] = useState(initial);
  const [localError, setLocalError] = useState("");

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setLocalError("");
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const age = Number(form.edad);
    if (form.password.length < 12) return setLocalError("La contraseña debe tener al menos 12 caracteres.");
    if (!Number.isInteger(age) || age < 18 || age > 120) return setLocalError("La edad debe estar entre 18 y 120 años.");
    if (!/^\+?[0-9]{10,15}$/.test(form.telefono)) return setLocalError("El telefono debe tener de 10 a 15 digitos, con + opcional.");
    if (!form.foto_identificacion) return setLocalError("Adjunta una identificacion en PNG o JPG.");
    if (!["image/png", "image/jpeg"].includes(form.foto_identificacion.type)) return setLocalError("La identificacion debe ser PNG, JPG o JPEG.");
    try {
      await register(form);
      navigate("/pendiente");
    } catch {
      // El mensaje visible lo gestiona AuthProvider.
    }
  }

  return (
    <AuthShell>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-950 dark:text-white">Registro</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Tu cuenta quedara pendiente hasta que administracion la autorice.</p>
        </div>
        {(localError || error) && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{localError || error}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field><Label>Nombre</Label><Input value={form.nombre_completo} onChange={(event) => update("nombre_completo", event.target.value)} required maxLength={100} /></Field>
          <Field><Label>Apellidos</Label><Input value={form.apellidos} onChange={(event) => update("apellidos", event.target.value)} required maxLength={100} /></Field>
          <Field><Label>Correo</Label><Input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required /></Field>
          <Field><Label>Contraseña</Label><Input type="password" value={form.password} onChange={(event) => update("password", event.target.value)} required minLength={12} /></Field>
          <Field><Label>Edad</Label><Input type="number" min={18} max={120} value={form.edad} onChange={(event) => update("edad", event.target.value)} required /></Field>
          <Field><Label>Telefono</Label><Input value={form.telefono} onChange={(event) => update("telefono", event.target.value)} required placeholder="+521234567890" /></Field>
          <Field><Label>Rol</Label><Select value={form.role} onChange={(event) => update("role", event.target.value as PublicRole)}>{PUBLIC_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</Select></Field>
          <Field><Label>Identificacion</Label><Input type="file" accept="image/png,image/jpeg" onChange={(event) => update("foto_identificacion", event.target.files?.[0] ?? null)} required /></Field>
        </div>
        <Field><Label>Direccion</Label><Input value={form.direccion} onChange={(event) => update("direccion", event.target.value)} required maxLength={255} /></Field>
        <Button className="w-full" disabled={loading}><UserPlus size={18} /> Enviar registro</Button>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          ¿Ya tienes cuenta? <Link className="font-semibold text-casa-cyan" to="/login">Inicia sesion</Link>
        </p>
      </form>
    </AuthShell>
  );
}
