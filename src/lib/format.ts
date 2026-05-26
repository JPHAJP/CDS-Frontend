export function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function initials(nombre: string, apellidos: string) {
  return `${nombre.charAt(0)}${apellidos.charAt(0)}`.toUpperCase();
}

export function qrValue(payload: { qr_code?: string; code?: string }) {
  return payload.qr_code ?? payload.code ?? "";
}

const QR_LOGIN_URL = import.meta.env.VITE_QR_LOGIN_URL ?? "https://cdslogin.jphajp.com/login";

export function qrLoginValue(payload: { qr_code?: string; code?: string; qr_url?: string }) {
  if (payload.qr_url) return payload.qr_url;

  const code = qrValue(payload).trim();
  if (!code) return "";

  const url = new URL(QR_LOGIN_URL);
  url.searchParams.set("qr", code);
  return url.toString();
}

export function qrCodeFromScan(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    return url.searchParams.get("qr")?.trim() || url.searchParams.get("code")?.trim() || trimmed;
  } catch {
    return trimmed;
  }
}
