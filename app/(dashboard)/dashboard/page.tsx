import Link from 'next/link'
import { requireStaff } from '@/lib/auth'
import { getDashboard } from '@/lib/services/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'
import { formatMoney, formatDateOnly } from '@/lib/format'
import { RefreshButton } from './refresh-button'

const alertaHref: Record<string, string> = {
  cuotas_vencidas: '/cobros',
  morosos: '/cobros',
  socios_pendientes: '/socios-pendientes',
  mantenimiento: '/espacios',
}

export const dynamic = 'force-dynamic'

const stat = (label: string, value: string | number, sub?: string, tone?: 'red' | 'green') => ({
  label,
  value,
  sub,
  tone,
})

export default async function DashboardPage() {
  const staff = await requireStaff()
  const d = await getDashboard()

  const cards = [
    stat('Socios activos', d.sociosActivos),
    stat('Con deuda vencida', d.sociosConDeudaVencida, undefined, d.sociosConDeudaVencida > 0 ? 'red' : undefined),
    stat('Deuda en cuenta corriente', formatMoney(d.deudaTotal), `${formatMoney(d.deudaVencida)} vencida`, d.deudaVencida > 0 ? 'red' : undefined),
    stat('Cuotas pendientes', d.cuotasPendientes, `${d.cuotasVencidas} vencidas`),
    stat('Reservas hoy', d.reservasHoy),
    stat('Canchas activas', d.canchasActivas),
    stat('Dentro del predio', d.personasDentro, `${d.accesosHoy} accesos hoy`),
    stat('Ingresos del mes', formatMoney(d.ingresosMes), `${formatMoney(d.egresosMes)} egresos`, 'green'),
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Hola {staff.nombre ?? staff.email}</p>
        </div>
        <RefreshButton />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} padding="md">
            <CardContent>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{c.label}</p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  c.tone === 'red'
                    ? 'text-red-600 dark:text-red-400'
                    : c.tone === 'green'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-zinc-900 dark:text-white'
                }`}
              >
                {c.value}
              </p>
              {c.sub && <p className="text-xs text-zinc-400 mt-1">{c.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" padding="md">
          <CardHeader>
            <CardTitle>Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            {d.alertas.length === 0 ? (
              <p className="text-center py-8 text-zinc-500 dark:text-zinc-400">Sin alertas</p>
            ) : (
              <div className="space-y-2">
                {d.alertas.map((a, i) => {
                  const href = alertaHref[a.tipo]
                  const alerta = (
                    <Alert
                      variant={a.prioridad === 'alta' ? 'danger' : a.prioridad === 'media' ? 'warning' : 'info'}
                      className={`text-sm ${href ? 'transition-opacity hover:opacity-80' : ''}`}
                    >
                      {a.mensaje}
                    </Alert>
                  )
                  return href ? (
                    <Link key={i} href={href} className="block">
                      {alerta}
                    </Link>
                  ) : (
                    <div key={i}>{alerta}</div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card padding="md">
          <CardHeader>
            <CardTitle>Próximos vencimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {d.proximosVencimientos.length === 0 && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Sin cuotas pendientes</p>
              )}
              {d.proximosVencimientos.map((v, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate text-zinc-900 dark:text-white">{v.persona}</p>
                    <p className="text-xs text-zinc-500">{v.concepto} · {formatDateOnly(v.fecha_vencimiento)}</p>
                  </div>
                  <div className="text-right pl-2">
                    <p className="text-sm font-medium">{formatMoney(v.saldo)}</p>
                    {v.vencida && <Badge variant="danger" size="sm">vencida</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="md">
          <CardHeader>
            <CardTitle>Ocupación de canchas (hoy)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {d.ocupacionHoy.map((o) => (
                <div key={o.espacio}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{o.espacio}</span>
                    <span className="text-zinc-500">{o.reservas} turnos · {o.porcentaje}%</span>
                  </div>
                  <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-900 dark:bg-white rounded-full" style={{ width: `${o.porcentaje}%` }} />
                  </div>
                </div>
              ))}
              {d.ocupacionHoy.length === 0 && <p className="text-sm text-zinc-500">Sin canchas activas</p>}
            </div>
          </CardContent>
        </Card>

        <Card padding="md">
          <CardHeader>
            <CardTitle>Últimos pagos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {d.ultimosPagos.length === 0 && <p className="text-sm text-zinc-500">Sin pagos registrados</p>}
              {d.ultimosPagos.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">{p.persona}</p>
                    <p className="text-xs text-zinc-500">{formatDateOnly(p.fecha)} · {p.medio ?? '—'}</p>
                  </div>
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">{formatMoney(p.monto)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
