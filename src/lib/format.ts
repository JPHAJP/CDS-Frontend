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
