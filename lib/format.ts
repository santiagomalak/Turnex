// Formateo para la UI (cliente y servidor). Sin dependencias de Node.

const ars = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatMoney(value: number): string {
  return ars.format(value ?? 0)
}

export function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** 'YYYY-MM-DD' -> 'DD/MM/YYYY' sin pasar por Date (evita corrimientos de zona). */
export function formatDateOnly(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}

/**
 * Fecha de "hoy" en huso horario Argentina, como 'YYYY-MM-DD'.
 * Usar esto (no `new Date().toISOString().slice(0, 10)`) para cualquier
 * cálculo de "hoy"/"fecha pasada" en el servidor: ese devuelve la fecha en
 * UTC, que se adelanta un día entre las 21:00 y las 23:59 hora Argentina.
 * Equivalente SQL: la función `hoy_ar()` (ver migraciones).
 */
export function hoyArgentina(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}
