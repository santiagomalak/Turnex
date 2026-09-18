import { requireStaff } from '@/lib/auth'
import { personasDentro } from '@/lib/services/acceso'
import { KioscoClient } from './kiosco-client'

export const dynamic = 'force-dynamic'

export default async function KioscoPage() {
  await requireStaff(['admin', 'recepcion'])
  const dentro = await personasDentro()
  return <KioscoClient dentroInicial={dentro} />
}
