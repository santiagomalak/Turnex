import { requireStaff } from '@/lib/auth'
import { listCuotasPendientesConPersona } from '@/lib/repos/cuota'
import { historial } from '@/lib/repos/movimiento'
import { listarDeudores } from '@/lib/services/cuenta-corriente'
import { CobrosClient } from './cobros-client'

export const dynamic = 'force-dynamic'

export default async function CobrosPage() {
  await requireStaff(['admin', 'recepcion', 'cobranzas'])
  const [cuotas, deudores, movimientos] = await Promise.all([
    listCuotasPendientesConPersona(),
    listarDeudores(),
    historial(100),
  ])
  return <CobrosClient cuotas={cuotas} deudores={deudores} movimientos={movimientos} />
}
