import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireStaff } from '@/lib/auth'
import { obtenerPersona } from '@/lib/services/persona'
import { getPlan } from '@/lib/repos/plan'
import { estadoDeCuenta } from '@/lib/services/cuenta-corriente'
import { listarPlanesPago } from '@/lib/services/plan-pago'
import { FichaClient } from './ficha-client'

export const dynamic = 'force-dynamic'

export default async function FichaPersonaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireStaff(['admin', 'recepcion', 'cobranzas'])
  const { id } = await params

  const persona = await obtenerPersona(id)
  if (!persona) notFound()

  const [cuenta, plan, planesPago] = await Promise.all([
    estadoDeCuenta(id),
    persona.plan_membresia_id ? getPlan(persona.plan_membresia_id) : Promise.resolve(null),
    listarPlanesPago(id),
  ])

  return (
    <div className="space-y-6">
      <Link href="/personas" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
        ← Volver a Personas
      </Link>
      <FichaClient persona={persona} plan={plan} cuenta={cuenta} planesPago={planesPago} />
    </div>
  )
}
