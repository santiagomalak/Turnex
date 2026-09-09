import { requireStaff } from '@/lib/auth'
import { listarPersonas } from '@/lib/services/persona'
import { listPlanes } from '@/lib/repos/plan'
import { PersonasClient } from './personas-client'

export const dynamic = 'force-dynamic'

export default async function PersonasPage() {
  await requireStaff(['admin', 'recepcion', 'cobranzas'])
  const [personas, planes] = await Promise.all([listarPersonas(), listPlanes()])
  return <PersonasClient personas={personas} planes={planes} />
}
