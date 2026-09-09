import { requireStaff } from '@/lib/auth'
import { listarPlanes } from '@/lib/services/plan'
import { PlanesClient } from './planes-client'

export const dynamic = 'force-dynamic'

export default async function PlanesPage() {
  await requireStaff(['admin'])
  const planes = await listarPlanes()
  return <PlanesClient planes={planes} />
}
