import { requireStaff } from '@/lib/auth'
import { listPersonas } from '@/lib/repos/persona'
import { cierreDeCaja, ventasDelDia, consumidorFinalId } from '@/lib/services/caja'
import { CajaClient } from './caja-client'

export const dynamic = 'force-dynamic'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export default async function CajaPage() {
  await requireStaff(['admin', 'recepcion', 'cobranzas'])
  const fecha = hoyISO()

  const cfId = await consumidorFinalId()
  const [personas, cierre, ventas] = await Promise.all([
    listPersonas(),
    cierreDeCaja(fecha),
    ventasDelDia(fecha),
  ])

  const opciones = personas
    .filter((p) => p.id !== cfId)
    .map((p) => ({
      id: p.id,
      label: `${p.apellido}, ${p.nombre}${p.dni ? ` · ${p.dni}` : ''}`,
    }))

  return <CajaClient personas={opciones} cierre={cierre} ventas={ventas} />
}
