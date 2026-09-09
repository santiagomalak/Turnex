import { listarPersonas } from '@/lib/services/persona'
import { listPlanes } from '@/lib/repos/plan'
import { PersonasClient } from './personas-client'

// Dashboard: siempre datos frescos (no cachear entre requests).
export const dynamic = 'force-dynamic'

export default async function PersonasPage() {
  const [personas, planes] = await Promise.all([listarPersonas(), listPlanes()])
  return <PersonasClient personas={personas} planes={planes} />
}
