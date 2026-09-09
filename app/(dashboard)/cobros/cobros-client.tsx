'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { formatMoney, formatDateOnly } from '@/lib/format'
import type { CuotaConPersona } from '@/lib/repos/cuota'
import type { MovimientoConPersona } from '@/lib/repos/movimiento'
import { generarCuotasAction, marcarVencidasAction } from './actions'

type Deudor = { persona_id: string; nombre: string; apellido: string; deuda: number; vencida: number }

const mesLabel = (periodo: string) => {
  const [y, m] = periodo.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

export function CobrosClient({
  cuotas,
  deudores,
  movimientos,
  periodo,
}: {
  cuotas: CuotaConPersona[]
  deudores: Deudor[]
  movimientos: MovimientoConPersona[]
  periodo: string
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'cuotas' | 'deudores' | 'historial'>('cuotas')
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [pending, start] = useTransition()

  function generar() {
    setAviso(null)
    start(async () => {
      const res = await generarCuotasAction(periodo)
      if (res.ok) {
        setAviso({ tipo: 'ok', texto: `${res.data.generadas} cuota(s) generada(s) para ${mesLabel(periodo)}.` })
        router.refresh()
      } else setAviso({ tipo: 'error', texto: res.error })
    })
  }

  function marcarVencidas() {
    setAviso(null)
    start(async () => {
      const res = await marcarVencidasAction()
      if (res.ok) {
        setAviso({ tipo: 'ok', texto: `${res.data.marcadas} cuota(s) marcadas como vencidas.` })
        router.refresh()
      } else setAviso({ tipo: 'error', texto: res.error })
    })
  }

  const totalPendiente = cuotas.reduce((s, c) => s + c.saldo, 0)
  const totalDeuda = deudores.reduce((s, d) => s + d.deuda, 0)

  const estadoCuotaBadge = (c: CuotaConPersona) => {
    if (c.estado === 'pagada') return <Badge variant="success">pagada</Badge>
    if (c.estado === 'parcial') return <Badge variant="warning">parcial</Badge>
    if (c.estado === 'vencida') return <Badge variant="danger">vencida</Badge>
    return <Badge variant="neutral">pendiente</Badge>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Cobros</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Cuotas, cuenta corriente y movimientos</p>
      </div>

      {aviso && (
        <Alert variant={aviso.tipo === 'ok' ? 'success' : 'danger'} dismissible onDismiss={() => setAviso(null)}>
          {aviso.texto}
        </Alert>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="cuotas">Cuotas ({cuotas.length})</TabsTrigger>
          <TabsTrigger value="deudores">Deudores ({deudores.length})</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="cuotas">
          <Card padding="md">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle>Cuotas por cobrar — {formatMoney(totalPendiente)}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={marcarVencidas} loading={pending}>
                  Marcar vencidas
                </Button>
                <Button size="sm" onClick={generar} loading={pending}>
                  Generar cuotas de {mesLabel(periodo)}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table
                columns={[
                  {
                    key: 'persona',
                    header: 'Socio',
                    render: (c: CuotaConPersona) => `${c.nombre} ${c.apellido}`,
                  },
                  {
                    key: 'concepto',
                    header: 'Concepto',
                    render: (c: CuotaConPersona) => c.concepto ?? (c.periodo ? `Cuota ${c.periodo.slice(0, 7)}` : '—'),
                  },
                  { key: 'vence', header: 'Vence', render: (c: CuotaConPersona) => formatDateOnly(c.fecha_vencimiento) },
                  { key: 'monto', header: 'Monto', render: (c: CuotaConPersona) => formatMoney(c.monto) },
                  { key: 'saldo', header: 'Saldo', render: (c: CuotaConPersona) => <span className="font-medium">{formatMoney(c.saldo)}</span> },
                  { key: 'estado', header: 'Estado', render: estadoCuotaBadge },
                  {
                    key: 'acc',
                    header: '',
                    render: (c: CuotaConPersona) => (
                      <Button size="sm" onClick={() => router.push(`/personas/${c.persona_id}`)}>
                        Cobrar
                      </Button>
                    ),
                  },
                ]}
                data={cuotas}
                keyExtractor={(c) => c.id}
                emptyMessage="No hay cuotas pendientes. Generá las del mes con el botón de arriba."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deudores">
          <Card padding="md">
            <CardHeader>
              <CardTitle>Cuenta corriente — deuda total {formatMoney(totalDeuda)}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table
                columns={[
                  { key: 'persona', header: 'Persona', render: (d: Deudor) => `${d.nombre} ${d.apellido}` },
                  { key: 'deuda', header: 'Debe', render: (d: Deudor) => <span className="font-medium">{formatMoney(d.deuda)}</span> },
                  {
                    key: 'vencida',
                    header: 'Vencida',
                    render: (d: Deudor) =>
                      d.vencida > 0 ? <span className="text-red-600 dark:text-red-400">{formatMoney(d.vencida)}</span> : '—',
                  },
                  {
                    key: 'acc',
                    header: '',
                    render: (d: Deudor) => (
                      <Button size="sm" onClick={() => router.push(`/personas/${d.persona_id}`)}>
                        Ver cuenta
                      </Button>
                    ),
                  },
                ]}
                data={deudores}
                keyExtractor={(d) => d.persona_id}
                emptyMessage="Nadie con deuda pendiente."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historial">
          <Card padding="md">
            <CardHeader>
              <CardTitle>Últimos movimientos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table
                columns={[
                  { key: 'fecha', header: 'Fecha', render: (m: MovimientoConPersona) => formatDateOnly(m.fecha) },
                  { key: 'persona', header: 'Persona', render: (m: MovimientoConPersona) => `${m.nombre} ${m.apellido}` },
                  {
                    key: 'detalle',
                    header: 'Detalle',
                    render: (m: MovimientoConPersona) => (
                      <span>
                        {m.clase === 'pago' ? 'Pago' : m.concepto ?? m.tipo}
                        {m.clase === 'pago' && m.medio_pago ? ` · ${m.medio_pago}` : ''}
                      </span>
                    ),
                  },
                  {
                    key: 'monto',
                    header: 'Monto',
                    render: (m: MovimientoConPersona) => (
                      <span className={m.clase === 'pago' ? 'text-green-600 dark:text-green-400' : ''}>
                        {m.clase === 'pago' ? '− ' : '+ '}
                        {formatMoney(m.monto)}
                      </span>
                    ),
                  },
                  {
                    key: 'dir',
                    header: '',
                    render: (m: MovimientoConPersona) =>
                      m.direccion === 'egreso' ? <Badge variant="danger">egreso</Badge> : null,
                  },
                ]}
                data={movimientos}
                keyExtractor={(m) => m.id}
                emptyMessage="Sin movimientos"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
