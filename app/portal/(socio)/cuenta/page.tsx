import { requireSocio } from '@/lib/auth'
import { datosPortal } from '@/lib/services/socio'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'
import { formatMoney, formatDateOnly } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function PortalCuentaPage() {
  const socio = await requireSocio()
  if (socio.estado === 'pendiente_aprobacion') {
    return <Alert variant="info">Tu cuenta todavía está pendiente de aprobación.</Alert>
  }

  const { cuenta } = await datosPortal(socio.personaId)
  const saldo = cuenta.saldo

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Mi cuenta</h1>

      <div className="grid grid-cols-2 gap-3">
        <Card padding="md">
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Saldo</p>
            <p className={`text-xl font-bold ${saldo > 0 ? 'text-red-600 dark:text-red-400' : saldo < 0 ? 'text-green-600 dark:text-green-400' : ''}`}>
              {formatMoney(Math.abs(saldo))}
            </p>
            <p className="text-[11px] text-zinc-400">{saldo > 0 ? 'debés' : saldo < 0 ? 'a favor' : 'al día'}</p>
          </CardContent>
        </Card>
        <Card padding="md">
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Vencido</p>
            <p className={`text-xl font-bold ${cuenta.deudaVencida > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
              {formatMoney(cuenta.deudaVencida)}
            </p>
          </CardContent>
        </Card>
      </div>

      {cuenta.cargosAbiertos.length > 0 && (
        <Card padding="md">
          <CardHeader>
            <CardTitle>Lo que debés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cuenta.cargosAbiertos.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-zinc-900 dark:text-white">{m.concepto ?? m.tipo}</p>
                    {m.vence_el && <p className="text-xs text-zinc-400">vence {formatDateOnly(m.vence_el)}</p>}
                  </div>
                  <span className="font-medium pl-2">{formatMoney(m.saldo)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card padding="md">
        <CardHeader>
          <CardTitle>Movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          {cuenta.movimientos.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 py-4 text-center">Sin movimientos</p>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {cuenta.movimientos.map((m) => (
                <div key={m.id} className="flex items-start justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-zinc-900 dark:text-white">
                      {m.concepto ?? (m.clase === 'pago' ? 'Pago' : m.tipo)}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {formatDateOnly(m.fecha)}
                      {m.clase === 'cargo' && m.estado !== 'saldado' && (
                        <Badge variant={m.estado === 'parcial' ? 'warning' : 'neutral'} size="sm" className="ml-2">
                          {m.estado}
                        </Badge>
                      )}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 font-medium ${m.clase === 'pago' ? 'text-green-600 dark:text-green-400' : ''}`}
                  >
                    {m.clase === 'pago' ? '−' : '+'} {formatMoney(m.monto)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
