import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import QrScanner from "qr-scanner";
import QRCode from "react-qr-code";
import { Camera, LogIn, LogOut, RefreshCw, UserRound } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Field, Input, Label, Select } from "../../components/ui/Form";
import { PageShell, Panel, ThemeToggle } from "../../components/ui/Shell";
import { apiErrorMessage, apiWebSocketUrl, qrApi } from "../../lib/api";
import { formatDate, qrCodeFromScan, qrLoginValue } from "../../lib/format";
import type { AccessType } from "../../types/api";
import { useAuth } from "../auth/auth-context";

export function QRScannerPage({ dark, onToggleTheme }: { dark: boolean; onToggleTheme: () => void }) {
  const { user, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const submittedQueryCodeRef = useRef("");
  const overlayIntervalRef = useRef<number | null>(null);
  const overlayTimeoutRef = useRef<number | null>(null);
  const scanLockedRef = useRef(false);
  const [code, setCode] = useState("");
  const [accessType, setAccessType] = useState<AccessType>(user?.access_status === "in" ? "exit" : "entry");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayStatus, setOverlayStatus] = useState<"success" | "failure">("success");
  const [overlayMessage, setOverlayMessage] = useState("");
  const [overlayCountdown, setOverlayCountdown] = useState(0);

  const stopOverlayTimers = useCallback(() => {
    if (overlayIntervalRef.current) {
      window.clearInterval(overlayIntervalRef.current);
      overlayIntervalRef.current = null;
    }
    if (overlayTimeoutRef.current) {
      window.clearTimeout(overlayTimeoutRef.current);
      overlayTimeoutRef.current = null;
    }
  }, []);

  const startOverlayCountdown = useCallback(() => {
    stopOverlayTimers();
    setOverlayCountdown(10);
    overlayIntervalRef.current = window.setInterval(() => {
      setOverlayCountdown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    overlayTimeoutRef.current = window.setTimeout(() => {
      if (overlayIntervalRef.current) {
        window.clearInterval(overlayIntervalRef.current);
        overlayIntervalRef.current = null;
      }
      setOverlayCountdown(0);
    }, 10_000);
  }, [stopOverlayTimers]);

  const lockScanning = useCallback(() => {
    scanLockedRef.current = true;
    setScanLocked(true);
  }, []);

  useEffect(() => {
    scanLockedRef.current = scanLocked;
  }, [scanLocked]);

  useEffect(() => {
    setAccessType(user?.access_status === "in" ? "exit" : "entry");
  }, [user?.access_status]);

  const submit = useCallback(async (value: string) => {
    setScanning(true);
    setError("");
    setMessage("");
    scannerRef.current?.stop();
    try {
      const normalizedCode = qrCodeFromScan(value);
      setCode(normalizedCode);
      const response = await qrApi.scan({ qr_code: normalizedCode, access_type: accessType });
      const successMessage = response.message || "Acceso registrado";
      setMessage(successMessage);
      setOverlayStatus("success");
      setOverlayMessage(successMessage);
      setOverlayOpen(true);
      startOverlayCountdown();
      setCode("");
      await refreshProfile();
      setAccessType(response.access_status === "in" ? "exit" : "entry");
    } catch (scanError) {
      const failureMessage = apiErrorMessage(scanError) || "Acceso rechazado";
      setError(failureMessage);
      setOverlayStatus("failure");
      setOverlayMessage(failureMessage);
      setOverlayOpen(true);
      startOverlayCountdown();
    } finally {
      setScanning(false);
    }
  }, [accessType, refreshProfile, startOverlayCountdown]);

  const startCamera = useCallback(async () => {
    if (!videoRef.current || scanLockedRef.current) return;
    setError("");
    scannerRef.current?.destroy();
    scannerRef.current = new QrScanner(videoRef.current, (result) => {
      if (scanLockedRef.current) return;
      const normalizedCode = qrCodeFromScan(result);
      lockScanning();
      setCode(normalizedCode);
      void submit(normalizedCode);
    });
    await scannerRef.current.start();
  }, [lockScanning, submit]);

  useEffect(() => () => {
    scannerRef.current?.destroy();
    stopOverlayTimers();
  }, [stopOverlayTimers]);

  useEffect(() => {
    void startCamera();
    return () => scannerRef.current?.stop();
  }, [startCamera]);

  useEffect(() => {
    const queryCode = searchParams.get("qr") ?? searchParams.get("code") ?? "";
    const normalizedCode = qrCodeFromScan(queryCode);
    if (!normalizedCode || submittedQueryCodeRef.current === normalizedCode) return;
    submittedQueryCodeRef.current = normalizedCode;
    lockScanning();
    setCode(normalizedCode);
    void submit(normalizedCode).then(() => navigate("/qr", { replace: true }));
  }, [lockScanning, navigate, searchParams, submit]);

  const closeOverlay = () => {
    if (overlayCountdown > 0) return;
    scanLockedRef.current = false;
    setOverlayOpen(false);
    setScanLocked(false);
    setOverlayMessage("");
  };

  return (
    <PageShell
      title="Escaneo QR"
      subtitle={`${user?.nombre_completo ?? "Usuario"} · ${user?.access_status === "in" ? "Dentro" : "Fuera"} · siguiente registro: ${accessType === "entry" ? "Entrada" : "Salida"}`}
      user={user}
      actions={<><ThemeToggle dark={dark} onToggle={onToggleTheme} /><Button variant="ghost"><Link to="/perfil" className="inline-flex items-center gap-2"><UserRound size={18} /><span className="hidden sm:inline">Perfil</span></Link></Button><Button variant="ghost" onClick={() => logout()}><LogOut size={18} /><span className="hidden sm:inline">Salir</span></Button></>}
    >
      <Panel className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <div className="rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800">
            <p className="font-semibold">Ultimo registro</p>
            <p className="mt-1 text-slate-600 dark:text-slate-300">
              {user?.last_access_log
                ? `${user.last_access_log.access_type === "entry" ? "Entrada" : "Salida"} · ${formatDate(user.last_access_log.timestamp)}`
                : "Sin registros todavia"}
            </p>
          </div>
          <Field>
            <Label>Tipo de registro</Label>
            <Select value={accessType} onChange={(event) => setAccessType(event.target.value as AccessType)}>
              <option value="entry">Entrada</option>
              <option value="exit">Salida</option>
            </Select>
          </Field>
          {message ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div> : null}
          {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        </div>
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950 dark:border-slate-800">
            <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 p-3 text-white">
              <span className="text-sm">Camara QR</span>
              <Button variant="secondary" onClick={startCamera} disabled={scanning || scanLocked}><Camera size={18} /> Iniciar camara</Button>
            </div>
          </div>
          <form className="space-y-3" onSubmit={(event) => {
            event.preventDefault();
            if (scanLockedRef.current) return;
            lockScanning();
            void submit(code);
          }}>
            <Field>
              <Label>Entrada manual</Label>
              <Input value={code} onChange={(event) => setCode(qrCodeFromScan(event.target.value))} minLength={32} placeholder="Pega el codigo QR si no puedes usar la camara" required disabled={scanLocked} />
            </Field>
            <Button disabled={scanning || scanLocked || !code.trim()}>
              {accessType === "entry" ? <LogIn size={18} /> : <LogOut size={18} />}
              Registrar {accessType === "entry" ? "entrada" : "salida"}
            </Button>
          </form>
        </div>
      </Panel>
      {overlayOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
          <div className={`w-full max-w-sm rounded-lg border p-5 text-center shadow-soft dark:bg-slate-900 ${
            overlayStatus === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700"
              : "border-red-300 bg-red-50 text-red-900 dark:border-red-700"
          }`}>
            <p className="text-xl font-semibold">{overlayStatus === "success" ? "Acceso registrado" : "Acceso rechazado"}</p>
            <p className="mt-2 text-sm">{overlayMessage}</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Espera {overlayCountdown}s para habilitar el cierre.
            </p>
            <Button className="mt-4 w-full" type="button" onClick={closeOverlay} disabled={overlayCountdown > 0}>
              Cerrar
            </Button>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}

export function KioskPage() {
  const query = useQuery({ queryKey: ["public-qr"], queryFn: qrApi.currentPublic, refetchInterval: 30_000 });
  const value = query.data ? qrLoginValue(query.data) : "";
  const [insideCount, setInsideCount] = useState(0);
  const [scanState, setScanState] = useState<"idle" | "success" | "failure">("idle");

  useEffect(() => {
    if (typeof query.data?.inside_count === "number") setInsideCount(query.data.inside_count);
  }, [query.data?.inside_count]);

  useEffect(() => {
    const socket = new WebSocket(apiWebSocketUrl("/public/ws/kiosk"));
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string; status?: "success" | "failure"; inside_count?: number };
        if (typeof payload.inside_count === "number") setInsideCount(payload.inside_count);
        if (payload.type === "SCAN_RESULT" && payload.status) {
          setScanState(payload.status);
          window.setTimeout(() => setScanState("idle"), 3000);
        }
      } catch {
        return;
      }
    };
    return () => socket.close();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (event.key === "F5" || (event.ctrlKey && key === "r")) {
        event.preventDefault();
        window.location.reload();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const reloadTimer = window.setInterval(() => window.location.reload(), 5 * 60 * 1000);
    return () => window.clearInterval(reloadTimer);
  }, []);

  const feedbackClasses = {
    idle: "bg-slate-950",
    success: "bg-emerald-500 kiosk-pulse-success",
    failure: "bg-red-600 kiosk-shake"
  }[scanState];
  const feedbackText = scanState === "success" ? "Acceso registrado" : scanState === "failure" ? "Acceso rechazado" : "QR de acceso Casa del Sol";

  return (
    <main className={`grid min-h-screen place-items-center p-4 text-white transition-colors duration-300 ${feedbackClasses}`}>
      <section className="w-full max-w-xl rounded-lg bg-white p-6 text-center text-slate-950 shadow-soft transition-transform duration-300">
        <div className="mb-4 flex justify-end">
          <Button type="button" variant="ghost" onClick={() => window.location.reload()}>
            <RefreshCw size={18} />
            Recargar
          </Button>
        </div>
        <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Personas dentro</p>
          <p className="mt-1 text-5xl font-bold text-slate-950">{insideCount}</p>
        </div>
        <h1 className="text-2xl font-bold">{feedbackText}</h1>
        <p className="mt-1 text-sm text-slate-500">Escanea este codigo desde tu cuenta autorizada.</p>
        <div className="mx-auto my-6 grid aspect-square max-w-sm place-items-center rounded-lg border border-slate-200 bg-white p-6">
          {value ? <QRCode value={value} className="h-full w-full" /> : <RefreshCw className="animate-spin text-slate-400" size={40} />}
        </div>
        <p className="text-sm text-slate-500">Expira: {formatDate(query.data?.expires_at ?? query.data?.expiresAt)}</p>
      </section>
    </main>
  );
}

export function AdminQRPanel() {
  const query = useQuery({ queryKey: ["admin-qr"], queryFn: qrApi.currentAdmin, refetchInterval: 30_000 });
  const value = query.data ? qrLoginValue(query.data) : "";
  return (
    <Panel className="text-center">
      <h2 className="mb-4 text-lg font-semibold">QR vigente</h2>
      <div className="mx-auto grid aspect-square max-w-xs place-items-center rounded-lg border border-slate-200 bg-white p-5">
        {value ? <QRCode value={value} className="h-full w-full" /> : <RefreshCw className="animate-spin text-slate-400" size={32} />}
      </div>
      <p className="mt-3 text-sm text-slate-500">Expira: {formatDate(query.data?.expires_at ?? query.data?.expiresAt)}</p>
    </Panel>
  );
}
