import { requireStaff } from '@/lib/auth'
import { listarSociosPendientes } from '@/lib/services/socio'
import { listPlanes } from '@/lib/repos/plan'
import { SociosPendientesClient } from './pendientes-client'

export const dynamic = 'force-dynamic'

export default async function SociosPendientesPage() {
  await requireStaff(['admin', 'recepcion'])
  const [pendientes, planes] = await Promise.all([
    listarSociosPendientes(),
    listPlanes({ soloActivos: true }),
  ])

  return (
    <SociosPendientesClient
      pendientes={pendientes}
      planes={planes.map((p) => ({ id: p.id, nombre: p.nombre, precio: p.precio_mensual }))}
    />
  )
}
