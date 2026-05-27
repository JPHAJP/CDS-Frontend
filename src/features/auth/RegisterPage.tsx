import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, UserPlus } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AuthShell } from "../../components/ui/Shell";
import { Button } from "../../components/ui/Button";
import { Field, Input, Label, Select } from "../../components/ui/Form";
import { PUBLIC_ROLES, ROLE_LABELS } from "../../lib/constants";
import type { PublicRole } from "../../types/api";
import { useAuth } from "./auth-context";
import manualVoluntariadoPdf from "../../assets/docs/manual-voluntariado-gvma.pdf";
import avisoPrivacidadPdf from "../../assets/docs/aviso-privacidad-qr.pdf";
import reglamentoQrPdf from "../../assets/docs/reglamento-qr.pdf";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerSrc;

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

const REGISTRATION_DOCUMENTS = [
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
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfVisitedPages, setPdfVisitedPages] = useState<Record<number, boolean>>({});
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [canConfirmRead, setCanConfirmRead] = useState(false);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfViewportRef = useRef<HTMLDivElement | null>(null);
  const [pdfViewportSize, setPdfViewportSize] = useState({ width: 0, height: 0 });

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
    const allAccepted = REGISTRATION_DOCUMENTS.every((document) => acceptedDocs[document.key]);
    if (!allAccepted) return setLocalError("Debes leer y aceptar todos los documentos obligatorios para registrarte.");
    try {
      await register({
        ...form,
        accepted_documents: REGISTRATION_DOCUMENTS.map((document) => document.key)
      });
      navigate("/pendiente");
    } catch {
      // El mensaje visible lo gestiona AuthProvider.
    }
  }

  function openDocument(index: number) {
    if (index > 0 && !acceptedDocs[REGISTRATION_DOCUMENTS[index - 1].key]) {
      setLocalError("Debes completar el documento anterior antes de continuar.");
      return;
    }
    setLocalError("");
    setActiveDocIndex(index);
    setPdfPage(1);
    setPdfPageCount(0);
    setPdfVisitedPages({});
    setPdfError("");
    setCanConfirmRead(false);
    setOpenedDocs((current) => ({ ...current, [REGISTRATION_DOCUMENTS[index].key]: true }));
  }

  function confirmRead() {
    if (activeDocIndex === null) return;
    const document = REGISTRATION_DOCUMENTS[activeDocIndex];
    setAcceptedDocs((current) => ({ ...current, [document.key]: true }));
    setActiveDocIndex(null);
    setPdfDocument(null);
    setPdfPage(1);
    setPdfPageCount(0);
    setPdfVisitedPages({});
    setPdfError("");
  }

  useEffect(() => {
    let cancelled = false;
    async function loadDocument() {
      if (activeDocIndex === null) return;
      setPdfLoading(true);
      setPdfError("");
      setCanConfirmRead(false);
      try {
        const loadingTask = getDocument(REGISTRATION_DOCUMENTS[activeDocIndex].url);
        const loaded = await loadingTask.promise;
        if (cancelled) return;
        setPdfDocument(loaded);
        setPdfPageCount(loaded.numPages);
        setPdfPage(1);
        setPdfVisitedPages({});
      } catch {
        if (cancelled) return;
        setPdfError("No se pudo abrir el documento. Intenta de nuevo.");
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    }
    void loadDocument();
    return () => {
      cancelled = true;
    };
  }, [activeDocIndex]);

  useEffect(() => {
    let cancelled = false;
    async function renderPage() {
      if (!pdfDocument || !canvasRef.current) return;
      setPdfLoading(true);
      try {
        const page = await pdfDocument.getPage(pdfPage);
        if (cancelled || !canvasRef.current) return;
        const viewport = page.getViewport({ scale: 1 });
        const box = pdfViewportRef.current?.getBoundingClientRect();
        const fitWidth = Math.max(260, (box?.width ?? window.innerWidth) - 24);
        const fitHeight = Math.max(280, (box?.height ?? window.innerHeight * 0.55) - 24);
        const scale = Math.max(0.25, Math.min(fitWidth / viewport.width, fitHeight / viewport.height));
        const scaledViewport = page.getViewport({ scale });
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context) return;
        canvas.width = Math.floor(scaledViewport.width * pixelRatio);
        canvas.height = Math.floor(scaledViewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(scaledViewport.width)}px`;
        canvas.style.height = `${Math.floor(scaledViewport.height)}px`;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        await page.render({ canvasContext: context, viewport: scaledViewport }).promise;
        if (!cancelled) {
          setPdfVisitedPages((current) => ({ ...current, [pdfPage]: true }));
        }
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    }
    void renderPage();
    return () => {
      cancelled = true;
    };
  }, [pdfDocument, pdfPage, pdfViewportSize]);

  useEffect(() => {
    if (!pdfViewportRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setPdfViewportSize({
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height)
      });
    });
    observer.observe(pdfViewportRef.current);
    return () => observer.disconnect();
  }, [activeDocIndex]);

  useEffect(() => {
    if (pdfPageCount > 0 && Object.keys(pdfVisitedPages).length >= pdfPageCount && pdfPage === pdfPageCount) {
      setCanConfirmRead(true);
    } else {
      setCanConfirmRead(false);
    }
  }, [pdfPage, pdfPageCount, pdfVisitedPages]);

  const pagesVisitedCount = useMemo(() => Object.keys(pdfVisitedPages).length, [pdfVisitedPages]);

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
        <section className="space-y-3 rounded-md border border-slate-200 p-4 dark:border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Documentos obligatorios</h3>
            <p className="text-sm text-slate-500">Debes abrir cada documento en orden, revisarlo y confirmar lectura para habilitar el registro.</p>
          </div>
          <div className="space-y-2">
            {REGISTRATION_DOCUMENTS.map((document, index) => {
              const accepted = Boolean(acceptedDocs[document.key]);
              const unlocked = index === 0 || Boolean(acceptedDocs[REGISTRATION_DOCUMENTS[index - 1].key]);
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
        <Button className="w-full" disabled={loading}><UserPlus size={18} /> Enviar registro</Button>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          ¿Ya tienes cuenta? <Link className="font-semibold text-casa-cyan" to="/login">Inicia sesion</Link>
        </p>
      </form>
      {activeDocIndex !== null ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-2 sm:p-4">
          <div className="flex h-[96vh] w-full max-w-6xl flex-col rounded-md bg-white p-3 dark:bg-slate-900 sm:p-4">
            <h3 className="mb-1 text-base font-semibold">{REGISTRATION_DOCUMENTS[activeDocIndex].title}</h3>
            <p className="mb-2 text-sm text-slate-500">Debes revisar todas las paginas. Avanza con los botones hasta la ultima pagina.</p>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
              <span>Pagina {pdfPage} de {pdfPageCount || "..."}</span>
              <span>Paginas revisadas: {pagesVisitedCount}/{pdfPageCount || "..."}</span>
            </div>
            <div ref={pdfViewportRef} className="h-[46dvh] overflow-auto rounded border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950 sm:h-[54dvh] lg:h-[58dvh]">
              {pdfLoading ? <p className="py-10 text-center text-sm text-slate-500">Cargando documento...</p> : null}
              {pdfError ? <p className="py-10 text-center text-sm text-red-600">{pdfError}</p> : null}
              {!pdfError ? (
                <div className="mx-auto flex w-full justify-center">
                  <canvas ref={canvasRef} className="max-w-full rounded bg-white shadow-sm" />
                </div>
              ) : null}
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Button className="w-full sm:w-auto" type="button" variant="ghost" disabled={pdfPage <= 1 || pdfLoading} onClick={() => setPdfPage((value) => Math.max(1, value - 1))}>
                  <ChevronLeft size={16} />
                  Anterior
                </Button>
                <Button className="w-full sm:w-auto" type="button" variant="ghost" disabled={pdfPageCount === 0 || pdfPage >= pdfPageCount || pdfLoading} onClick={() => setPdfPage((value) => Math.min(pdfPageCount, value + 1))}>
                  Siguiente
                  <ChevronRight size={16} />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Button className="w-full sm:w-auto" type="button" variant="ghost" onClick={() => setActiveDocIndex(null)}>Cerrar</Button>
                <Button className="w-full sm:w-auto" type="button" disabled={!canConfirmRead || pdfLoading} onClick={confirmRead}>Aceptar</Button>
              </div>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {canConfirmRead ? "Lectura completa, ya puedes aceptar este documento." : "Debes llegar a la ultima pagina y revisar todas las paginas para habilitar Aceptar."}
            </div>
          </div>
        </div>
      ) : null}
    </AuthShell>
  );
}
