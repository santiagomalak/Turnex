import Link from 'next/link'
import { requireSocio } from '@/lib/auth'
import { datosPortal } from '@/lib/services/socio'
import { Card, CardContent } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { formatMoney, formatDateOnly } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function PortalHome() {
  const socio = await requireSocio()

  if (socio.estado === 'pendiente_aprobacion') {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Hola {socio.nombre.split(' ')[0]}</h1>
        <Alert variant="info" title="Tu cuenta está pendiente de aprobación">
          Recepción va a revisar tus datos y asignarte un plan. Cuando esté lista vas a poder ver
          tu estado de cuenta y reservar canchas.
        </Alert>
      </div>
    )
  }

  const { persona, plan, cuenta } = await datosPortal(socio.personaId)
  const saldo = cuenta.saldo

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Hola {persona.nombre.split(' ')[0]}</h1>
        {plan && <p className="text-sm text-zinc-500 dark:text-zinc-400">Plan {plan.nombre}</p>}
      </div>

      <Card padding="md">
        <CardContent>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Saldo de tu cuenta</p>
          <p
            className={`text-3xl font-bold mt-1 ${
              saldo > 0 ? 'text-red-600 dark:text-red-400' : saldo < 0 ? 'text-green-600 dark:text-green-400' : 'text-zinc-900 dark:text-white'
            }`}
          >
            {formatMoney(Math.abs(saldo))}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            {saldo > 0 ? 'debés' : saldo < 0 ? 'a favor' : 'estás al día'}
          </p>
        </CardContent>
      </Card>

      {cuenta.deudaVencida > 0 && (
        <Alert variant="danger">
          Tenés {formatMoney(cuenta.deudaVencida)} vencido. Acercate a recepción para regularizar.
        </Alert>
      )}

      {cuenta.proximoVencimiento && (
        <Card padding="md">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Próximo vencimiento</p>
              <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                {formatMoney(cuenta.proximoVencimiento.monto)}
              </p>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {formatDateOnly(cuenta.proximoVencimiento.fecha)}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/portal/reservar"
          className="rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 p-4 text-center font-medium"
        >
          Reservar cancha
        </Link>
        <Link
          href="/portal/cuenta"
          className="rounded-xl border border-zinc-300 dark:border-zinc-700 p-4 text-center font-medium text-zinc-900 dark:text-white"
        >
          Mi cuenta
        </Link>
      </div>
    </div>
  )
}
