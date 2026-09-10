import { requireStaff } from '@/lib/auth'
import { listarReservas } from '@/lib/services/reserva'
import { listEspacios } from '@/lib/repos/espacio'
import { listPersonas } from '@/lib/repos/persona'
import { ReservasClient } from './reservas-client'

export const dynamic = 'force-dynamic'

function inicioDeSemana(iso: string | undefined): string {
  const d = iso ? new Date(iso + 'T00:00:00Z') : new Date()
  const dow = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - dow)
  return d.toISOString().slice(0, 10)
}

export default async function ReservasPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; cancha?: string }>
}) {
  await requireStaff(['admin', 'recepcion', 'profesor'])
  const sp = await searchParams
  const semana = inicioDeSemana(sp.semana)
  const finSemana = new Date(new Date(semana + 'T00:00:00Z').getTime() + 6 * 86400000)
    .toISOString()
    .slice(0, 10)

  const [espacios, personas] = await Promise.all([listEspacios(), listPersonas()])
  const canchaId = sp.cancha && espacios.some((e) => e.id === sp.cancha) ? sp.cancha : undefined
  const reservas = await listarReservas({
    desde: semana,
    hasta: finSemana,
    espacioId: canchaId,
  })

  return (
    <ReservasClient
      reservas={reservas}
      espacios={espacios}
      personas={personas.filter((p) => p.rol === 'socio' || p.rol === 'invitado')}
      semana={semana}
      canchaId={canchaId ?? ''}
    />
  )
}
