import { requireSocio } from '@/lib/auth'
import { datosPortal } from '@/lib/services/socio'
import { listEspacios } from '@/lib/repos/espacio'
import { listarReservas } from '@/lib/services/reserva'
import { Alert } from '@/components/ui/Alert'
import { ReservarClient } from './reservar-client'

export const dynamic = 'force-dynamic'

function ventana(): { desde: string; hasta: string } {
  const d = new Date()
  const desde = d.toISOString().slice(0, 10)
  d.setDate(d.getDate() + 8)
  return { desde, hasta: d.toISOString().slice(0, 10) }
}

export default async function PortalReservarPage() {
  const socio = await requireSocio()
  if (socio.estado === 'pendiente_aprobacion') {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Reservar cancha</h1>
        <Alert variant="info">Vas a poder reservar cuando recepción active tu cuenta.</Alert>
      </div>
    )
  }

  const { plan } = await datosPortal(socio.personaId)
  const { desde, hasta } = ventana()

  const [espacios, reservas] = await Promise.all([
    listEspacios({ soloActivas: true }),
    listarReservas({ desde, hasta }),
  ])

  return (
    <ReservarClient
      espacios={espacios.map((e) => ({ id: e.id, nombre: e.nombre, tipo: e.tipo, precioPorHora: e.precio_por_hora }))}
      ocupados={reservas
        .filter((r) => r.estado !== 'cancelada')
        .map((r) => ({ espacioId: r.espacio_id, fecha: r.fecha, horaInicio: r.hora_inicio, horaFin: r.hora_fin }))}
      incluyeCanchas={plan?.incluye_canchas ?? false}
      descuento={plan?.descuento_porcentaje ?? 0}
    />
  )
}
