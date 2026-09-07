'use client'

import { useEffect, useState } from 'react'
import { store } from '@/lib/store-supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import type { Alerta, Cuota, Movimiento, Persona, Espacio } from '@/lib/types-supabase'

const statCards = [
  { key: 'totalSocios', label: 'Total Socios', color: 'bg-blue-500' },
  { key: 'morosos', label: 'Morosos', color: 'bg-red-500' },
  { key: 'cuotasPendientes', label: 'Cuotas Pendientes', color: 'bg-amber-500' },
  { key: 'cuotasVencidas', label: 'Cuotas Vencidas', color: 'bg-red-600' },
  { key: 'reservasHoy', label: 'Reservas Hoy', color: 'bg-green-500' },
  { key: 'espaciosActivos', label: 'Canchas Activas', color: 'bg-purple-500' },
  { key: 'ingresosMes', label: 'Ingresos del Mes', color: 'bg-emerald-500', currency: true },
  { key: 'accesosHoy', label: 'Accesos Hoy', color: 'bg-indigo-500' },
]

function Icon({ color }: { color: string }) {
  return <div className={`p-3 rounded-xl ${color} text-white`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
}

export default function DashboardPage() {
  const [stats, setStats] = useState(store.getStats())
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [cuotasProximas, setCuotasProximas] = useState<Cuota[]>([])
  const [ultimosPagos, setUltimosPagos] = useState<Movimiento[]>([])
  const [ocupacion, setOcupacion] = useState<{ espacio: Espacio; ocupacion: number }[]>([])
  const [loading, setLoading] = useState(true)

  const formatCurrency = (value: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value)

  async function loadData() {
    setLoading(true)
    try {
      const [s, a, cp, up, occ] = await Promise.all([
        store.getStats(),
        store.getAlertas(true),
        store.getCuotas({ estado: 'pendiente' }),
        store.getMovimientos(),
        store.getEspacios(),
      ])
      setStats(s)
      setAlertas(a)
      setCuotasProximas(cp.slice(0, 5))
      setUltimosPagos(up.slice(0, 5))

      // Calcular ocupación de hoy
      const hoy = new Date().toISOString().split('T')[0]
      const ocupacionData = await Promise.all(
        occ.filter(e => e.estado === 'activa').map(async (espacio) => {
          const reservas = await store.getReservas({ fecha: hoy, espacioId: espacio.id })
          const confirmadas = reservas.filter(r => r.estado === 'confirmada').length
          const totalHoras = 14
          const ocupacion = Math.round((confirmadas / totalHoras) * 100)
          return { espacio, ocupacion }
        })
      )
      setOcupacion(ocupacionData)
    } catch (err) {
      console.error('Error loading dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-zinc-900 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Vista general del complejo deportivo</p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">Actualizar</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        {statCards.map(card => (
          <Card key={card.key} padding="md">
            <CardContent className="flex items-start justify-between">
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{card.label}</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
                  {card.currency ? formatCurrency(stats[card.key as keyof typeof stats] as number) : stats[card.key as keyof typeof stats]}
                </p>
              </div>
              <Icon color={card.color} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" padding="md">
          <CardHeader>
            <CardTitle>Alertas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {alertas.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <p>No hay alertas pendientes</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {alertas.slice(0, 10).map(alerta => (
                  <Alert
                    key={alerta.id}
                    variant={alerta.prioridad === 'critica' || alerta.prioridad === 'alta' ? 'danger' : alerta.prioridad === 'media' ? 'warning' : 'info'}
                    title={alerta.tipo.replace(/_/g, ' ').toUpperCase()}
                    dismissible
                    onDismiss={() => { /* store.marcarAlertaLeida */ setAlertas(prev => prev.filter(a => a.id !== alerta.id)) }}
                    className="text-sm"
                  >
                    {alerta.mensaje}
                  </Alert>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => { /* store.marcarTodasLeidas */ }}>Marcar todas como leídas</Button>
            </div>
          </CardContent>
        </Card>

        <Card padding="md">
          <CardHeader>
            <CardTitle>Próximos Vencimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cuotasProximas.map(cuota => (
                <div key={cuota.id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">Socio ID: {cuota.persona_id}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Vence {cuota.fecha_vencimiento} · {formatCurrency(cuota.monto)}</p>
                  </div>
                  <Badge variant={new Date(cuota.fecha_vencimiento) < new Date() ? 'danger' : 'warning'}>{new Date(cuota.fecha_vencimiento) < new Date() ? 'Vencida' : 'Pendiente'}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="md">
          <CardHeader>
            <CardTitle>Ocupación de Canchas (Hoy)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ocupacion.map(({ espacio, ocupacion }) => (
                <div key={espacio.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{espacio.nombre}</span>
                    <span className="text-zinc-500 dark:text-zinc-400">{ocupacion}%</span>
                  </div>
                  <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-900 dark:bg-white rounded-full transition-all" style={{ width: `${ocupacion}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card padding="md">
          <CardHeader>
            <CardTitle>Últimos Pagos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ultimosPagos.map(mov => (
                <div key={mov.id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">Persona: {mov.persona_id}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{mov.tipo} · {mov.medio_pago}</p>
                  </div>
                  <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(mov.monto)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}