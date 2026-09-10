import { requireStaff } from '@/lib/auth'
import { listarAbonos } from '@/lib/services/abono'
import { listEspacios } from '@/lib/repos/espacio'
import { listPersonas } from '@/lib/repos/persona'
import { AbonosClient } from './abonos-client'

export const dynamic = 'force-dynamic'

export default async function AbonosPage() {
  await requireStaff(['admin', 'recepcion'])
  const [abonos, espacios, personas] = await Promise.all([
    listarAbonos(),
    listEspacios({ soloActivas: true }),
    listPersonas(),
  ])
  return (
    <AbonosClient
      abonos={abonos}
      espacios={espacios}
      personas={personas.filter((p) => p.rol === 'socio' || p.rol === 'invitado')}
    />
  )
}
