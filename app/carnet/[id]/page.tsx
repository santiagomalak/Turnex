import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { requireStaff } from '@/lib/auth'
import { obtenerPersona } from '@/lib/services/persona'
import { getPlan } from '@/lib/repos/plan'
import { getConfig } from '@/lib/config'
import { PrintButton } from './print-button'

export const dynamic = 'force-dynamic'

export default async function CarnetPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff(['admin', 'recepcion'])
  const { id } = await params
  const persona = await obtenerPersona(id)
  if (!persona) notFound()

  const [plan, complejo, qr] = await Promise.all([
    persona.plan_membresia_id ? getPlan(persona.plan_membresia_id) : Promise.resolve(null),
    getConfig<string>('complejo.nombre'),
    QRCode.toDataURL(persona.qr_token, { margin: 1, width: 320 }),
  ])

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 p-6 print:bg-white print:p-0">
      <div className="max-w-sm mx-auto space-y-4">
        <div className="flex justify-between items-center print:hidden">
          <a href={`/personas/${id}`} className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white">← Volver</a>
          <PrintButton />
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden print:shadow-none print:border-zinc-400">
          <div className="bg-zinc-900 text-white px-5 py-3">
            <p className="text-xs uppercase tracking-wide opacity-70">{complejo ?? 'Complejo Deportivo'}</p>
            <p className="font-semibold">Carnet de socio</p>
          </div>
          <div className="p-5 space-y-4 text-zinc-900">
            <div>
              <p className="text-lg font-bold leading-tight">{persona.nombre} {persona.apellido}</p>
              <p className="text-sm text-zinc-500">
                DNI {persona.dni ?? '—'}
                {plan ? ` · Plan ${plan.nombre}` : ''}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Socio desde {persona.fecha_alta.slice(0, 10)}
                {persona.estado !== 'activo' ? ` · ${persona.estado}` : ''}
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="Código QR del carnet" className="w-48 h-48 mx-auto" />
            <p className="text-center text-[10px] text-zinc-400 font-mono break-all">{persona.qr_token}</p>
          </div>
        </div>

        <p className="text-xs text-zinc-500 text-center print:hidden">
          Presentá este código en recepción para el ingreso.
        </p>
      </div>
    </div>
  )
}
