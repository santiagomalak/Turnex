import QRCode from 'qrcode'
import { requireSocio } from '@/lib/auth'
import { getPersonaPortal } from '@/lib/services/socio'
import { getPlan } from '@/lib/repos/plan'
import { getConfig } from '@/lib/config'
import { Alert } from '@/components/ui/Alert'

export const dynamic = 'force-dynamic'

export default async function PortalCarnetPage() {
  const socio = await requireSocio()
  const persona = await getPersonaPortal(socio.personaId)
  if (!persona) return <Alert variant="danger">No se encontró tu ficha.</Alert>
  if (persona.estado === 'pendiente_aprobacion') {
    return <Alert variant="info">Vas a tener tu carnet cuando recepción active tu cuenta.</Alert>
  }

  const [plan, complejo, qr] = await Promise.all([
    persona.plan_membresia_id ? getPlan(persona.plan_membresia_id) : Promise.resolve(null),
    getConfig<string>('complejo.nombre'),
    QRCode.toDataURL(persona.qr_token, { margin: 1, width: 360 }),
  ])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Mi carnet</h1>
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden text-zinc-900">
        <div className="bg-zinc-900 text-white px-5 py-3">
          <p className="text-xs uppercase tracking-wide opacity-70">{complejo ?? 'Complejo Deportivo'}</p>
          <p className="font-semibold">Carnet de socio</p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-lg font-bold leading-tight">{persona.nombre} {persona.apellido}</p>
            <p className="text-sm text-zinc-500">
              DNI {persona.dni ?? '—'}
              {plan ? ` · Plan ${plan.nombre}` : ''}
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Código QR de tu carnet" className="w-full max-w-[240px] mx-auto" />
        </div>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
        Mostrá este código en recepción para ingresar.
      </p>
    </div>
  )
}
