import { requireStaff } from '@/lib/auth'
import { listarEspacios } from '@/lib/services/espacio'
import { EspaciosClient } from './espacios-client'

export const dynamic = 'force-dynamic'

export default async function EspaciosPage() {
  await requireStaff(['admin', 'recepcion'])
  const espacios = await listarEspacios()
  return <EspaciosClient espacios={espacios} />
}
