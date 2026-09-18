import { requireStaff } from '@/lib/auth'
import { listPersonas } from '@/lib/repos/persona'
import { CarnetsClient } from './carnets-client'

export const dynamic = 'force-dynamic'

export default async function CarnetsPage() {
  await requireStaff(['admin', 'recepcion'])
  const socios = await listPersonas({ rol: 'socio' })
  return <CarnetsClient socios={socios} />
}
