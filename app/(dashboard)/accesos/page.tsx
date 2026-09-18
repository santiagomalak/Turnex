import { requireStaff } from '@/lib/auth'
import { personasDentro, historialAccesos } from '@/lib/services/acceso'
import { listPersonas } from '@/lib/repos/persona'
import { hoyArgentina } from '@/lib/format'
import { AccesosClient } from './accesos-client'

export const dynamic = 'force-dynamic'

export default async function AccesosPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; persona?: string }>
}) {
  await requireStaff(['admin', 'recepcion'])
  const sp = await searchParams
  const hoy = hoyArgentina()
  const desde = sp.desde ?? hoy
  const hasta = sp.hasta ?? hoy

  const [dentro, historial, personas] = await Promise.all([
    personasDentro(),
    historialAccesos({ desde, hasta, personaId: sp.persona || undefined }),
    listPersonas(),
  ])

  return (
    <AccesosClient
      dentro={dentro}
      historial={historial}
      personas={personas}
      filtros={{ desde, hasta, persona: sp.persona ?? '' }}
    />
  )
}
