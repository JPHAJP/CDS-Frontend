import { Link, useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AuthShell } from "../../components/ui/Shell";
import { Button } from "../../components/ui/Button";
import { Field, Input, Label, Select } from "../../components/ui/Form";
import { PUBLIC_ROLES, ROLE_LABELS } from "../../lib/constants";
import type { PublicRole } from "../../types/api";
import { useAuth } from "./auth-context";
import manualVoluntariadoPdf from "../../assets/docs/manual-voluntariado-gvma.pdf";
import avisoPrivacidadPdf from "../../assets/docs/aviso-privacidad-qr.pdf";
import reglamentoQrPdf from "../../assets/docs/reglamento-qr.pdf";

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

const VOLUNTEER_DOCUMENTS = [
  { key: "manual_voluntariado", title: "Manual de Voluntariado", url: manualVoluntariadoPdf },
  { key: "aviso_privacidad_qr", title: "Aviso de Privacidad QR", url: avisoPrivacidadPdf },
  { key: "reglamento_qr", title: "Reglamento QR", url: reglamentoQrPdf }
] as const;

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, loading, error } = useAuth();
  const [form, setForm] = useState(initial);
  const [localError, setLocalError] = useState("");
  const [openedDocs, setOpenedDocs] = useState<Record<string, boolean>>({});
  const [acceptedDocs, setAcceptedDocs] = useState<Record<string, boolean>>({});
  const [activeDocIndex, setActiveDocIndex] = useState<number | null>(null);
  const [canConfirmRead, setCanConfirmRead] = useState(false);

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
    if (form.role === "voluntarios") {
      const allAccepted = VOLUNTEER_DOCUMENTS.every((document) => acceptedDocs[document.key]);
      if (!allAccepted) return setLocalError("Para voluntariado debes leer y aceptar todos los documentos obligatorios.");
    }
    try {
      await register({
        ...form,
        accepted_documents: form.role === "voluntarios" ? VOLUNTEER_DOCUMENTS.map((document) => document.key) : []
      });
      navigate("/pendiente");
    } catch {
      // El mensaje visible lo gestiona AuthProvider.
    }
  }

  function openDocument(index: number) {
    if (index > 0 && !acceptedDocs[VOLUNTEER_DOCUMENTS[index - 1].key]) {
      setLocalError("Debes completar el documento anterior antes de continuar.");
      return;
    }
    setLocalError("");
    setCanConfirmRead(false);
    setActiveDocIndex(index);
    setTimeout(() => setCanConfirmRead(true), 4000);
    setOpenedDocs((current) => ({ ...current, [VOLUNTEER_DOCUMENTS[index].key]: true }));
  }

  function confirmRead() {
    if (activeDocIndex === null) return;
    const document = VOLUNTEER_DOCUMENTS[activeDocIndex];
    setAcceptedDocs((current) => ({ ...current, [document.key]: true }));
    setActiveDocIndex(null);
    setCanConfirmRead(false);
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
        {form.role === "voluntarios" ? (
          <section className="space-y-3 rounded-md border border-slate-200 p-4 dark:border-slate-800">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Documentos obligatorios para voluntariado</h3>
              <p className="text-sm text-slate-500">Debes abrir cada documento en orden, revisarlo y confirmar lectura para habilitar el registro.</p>
            </div>
            <div className="space-y-2">
              {VOLUNTEER_DOCUMENTS.map((document, index) => {
                const accepted = Boolean(acceptedDocs[document.key]);
                const unlocked = index === 0 || Boolean(acceptedDocs[VOLUNTEER_DOCUMENTS[index - 1].key]);
                return (
                  <div key={document.key} className="flex flex-col gap-2 rounded-md border border-slate-200 p-3 dark:border-slate-700">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{index + 1}. {document.title}</p>
                      <Button type="button" variant="ghost" disabled={!unlocked} onClick={() => openDocument(index)}>
                        Abrir documento
                      </Button>
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={accepted} readOnly />
                      <span>{accepted ? "Leido y aceptado" : "Pendiente de lectura y aceptacion"}</span>
                    </label>
                    {!openedDocs[document.key] ? <p className="text-xs text-slate-500">Aun no se ha abierto este documento.</p> : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
        <Button className="w-full" disabled={loading}><UserPlus size={18} /> Enviar registro</Button>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          ¿Ya tienes cuenta? <Link className="font-semibold text-casa-cyan" to="/login">Inicia sesion</Link>
        </p>
      </form>
      {activeDocIndex !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex h-[92vh] w-full max-w-5xl flex-col rounded-md bg-white p-4 dark:bg-slate-900">
            <h3 className="mb-2 text-base font-semibold">{VOLUNTEER_DOCUMENTS[activeDocIndex].title}</h3>
            <p className="mb-3 text-sm text-slate-500">Recorre el contenido y al finalizar confirma lectura para continuar.</p>
            <iframe
              title={VOLUNTEER_DOCUMENTS[activeDocIndex].title}
              src={VOLUNTEER_DOCUMENTS[activeDocIndex].url}
              className="min-h-0 flex-1 rounded border border-slate-200 dark:border-slate-700"
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setActiveDocIndex(null)}>Cerrar</Button>
              <Button type="button" disabled={!canConfirmRead} onClick={confirmRead}>Confirmar lectura y aceptar</Button>
            </div>
          </div>
        </div>
      ) : null}
    </AuthShell>
  );
}
