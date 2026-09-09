'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Alert } from '@/components/ui/Alert'
import { formatMoney, formatDateOnly } from '@/lib/format'
import type { Persona, PlanMembresia, Movimiento, PlanPago } from '@/lib/types-supabase'
import type { EstadoDeCuenta } from '@/lib/services/cuenta-corriente'
import {
  registrarPagoAction,
  registrarCargoAction,
  crearPlanPagoAction,
  anularMovimientoAction,
} from './actions'

const medioOptions = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'mercadopago', label: 'MercadoPago' },
  { value: 'modo', label: 'MODO' },
  { value: 'debito_automatico', label: 'Débito automático' },
]

type FormError = { error: string; fieldErrors?: Record<string, string> }
type Modal_ = 'pago' | 'cargo' | 'plan' | null
type RunResult =
  | { ok: true; data?: { aFavor?: number } }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

export function FichaClient({
  persona,
  plan,
  cuenta,
  planesPago,
}: {
  persona: Persona
  plan: PlanMembresia | null
  cuenta: EstadoDeCuenta
  planesPago: PlanPago[]
}) {
  const router = useRouter()
  const [modal, setModal] = useState<Modal_>(null)
  const [formError, setFormError] = useState<FormError | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function run(fn: () => Promise<RunResult>) {
    setFormError(null)
    start(async () => {
      const res = await fn()
      if (res.ok) {
        setModal(null)
        if (res.data?.aFavor && res.data.aFavor > 0) {
          setAviso(`Pago registrado. Quedó ${formatMoney(res.data.aFavor)} a favor del socio.`)
        }
        router.refresh()
      } else {
        setFormError({ error: res.error, fieldErrors: res.fieldErrors })
      }
    })
  }

  function anular(m: Movimiento) {
    const q = m.clase === 'pago' ? 'Anular este pago revierte sus imputaciones.' : 'Anular este cargo.'
    if (!confirm(`${q} ¿Confirmás?`)) return
    setAviso(null)
    start(async () => {
      const res = await anularMovimientoAction(persona.id, m.id, m.clase)
      if (res.ok) router.refresh()
      else setAviso(res.error)
    })
  }

  const fe = formError?.fieldErrors
  const saldo = cuenta.saldo
  const hoyISO = new Date().toISOString().slice(0, 10)

  const estadoMovBadge = (m: Movimiento) => {
    if (m.clase === 'pago') return <Badge variant="success">pago</Badge>
    if (m.estado === 'saldado') return <Badge variant="success">saldado</Badge>
    if (m.estado === 'parcial') return <Badge variant="warning">parcial</Badge>
    if (m.vence_el && m.vence_el < hoyISO) return <Badge variant="danger">vencido</Badge>
    return <Badge variant="neutral">pendiente</Badge>
  }

  return (
    <div className="space-y-6">
      {aviso && (
        <Alert variant="info" dismissible onDismiss={() => setAviso(null)}>
          {aviso}
        </Alert>
      )}

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            {persona.nombre} {persona.apellido}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            <Badge variant="default">{persona.rol}</Badge>
            <Badge variant={persona.estado === 'activo' ? 'success' : persona.estado === 'moroso' ? 'danger' : 'neutral'}>
              {persona.estado.replace(/_/g, ' ')}
            </Badge>
            {plan && <span>Plan {plan.nombre}</span>}
            {persona.dni && <span>· DNI {persona.dni}</span>}
            {persona.email && <span>· {persona.email}</span>}
            {persona.telefono && <span>· {persona.telefono}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { setFormError(null); setModal('pago') }}>Registrar pago</Button>
          <Button variant="outline" onClick={() => { setFormError(null); setModal('cargo') }}>Registrar cargo</Button>
          <Button variant="outline" onClick={() => { setFormError(null); setModal('plan') }}>Plan de pago</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="md">
          <CardContent>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Saldo</p>
            <p className={`text-2xl font-bold mt-1 ${saldo > 0 ? 'text-red-600 dark:text-red-400' : saldo < 0 ? 'text-green-600 dark:text-green-400' : 'text-zinc-900 dark:text-white'}`}>
              {formatMoney(Math.abs(saldo))}
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              {saldo > 0 ? 'debe' : saldo < 0 ? 'a favor' : 'al día'}
            </p>
          </CardContent>
        </Card>
        <Card padding="md">
          <CardContent>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Deuda vencida</p>
            <p className={`text-2xl font-bold mt-1 ${cuenta.deudaVencida > 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-white'}`}>
              {formatMoney(cuenta.deudaVencida)}
            </p>
          </CardContent>
        </Card>
        <Card padding="md">
          <CardContent>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Próximo vencimiento</p>
            {cuenta.proximoVencimiento ? (
              <>
                <p className="text-2xl font-bold mt-1 text-zinc-900 dark:text-white">
                  {formatMoney(cuenta.proximoVencimiento.monto)}
                </p>
                <p className="text-xs text-zinc-400 mt-1">{formatDateOnly(cuenta.proximoVencimiento.fecha)}</p>
              </>
            ) : (
              <p className="text-2xl font-bold mt-1 text-zinc-400">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {cuenta.aPagarAlComplejo > 0 && (
        <Alert variant="warning">
          El complejo le debe {formatMoney(cuenta.aPagarAlComplejo)} (pagos a staff/profesor pendientes).
        </Alert>
      )}

      {cuenta.cargosAbiertos.length > 0 && (
        <Card padding="md">
          <CardHeader>
            <CardTitle>Deudas abiertas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table
              columns={[
                { key: 'concepto', header: 'Concepto', render: (m: Movimiento) => m.concepto ?? m.tipo },
                { key: 'vence', header: 'Vence', render: (m: Movimiento) => (m.vence_el ? formatDateOnly(m.vence_el) : '—') },
                { key: 'monto', header: 'Monto', render: (m: Movimiento) => formatMoney(m.monto) },
                { key: 'saldo', header: 'Saldo', render: (m: Movimiento) => <span className="font-medium">{formatMoney(m.saldo)}</span> },
                { key: 'estado', header: 'Estado', render: estadoMovBadge },
              ]}
              data={cuenta.cargosAbiertos}
              keyExtractor={(m) => m.id}
              emptyMessage="—"
            />
          </CardContent>
        </Card>
      )}

      {planesPago.length > 0 && (
        <Card padding="md">
          <CardHeader>
            <CardTitle>Planes de pago</CardTitle>
          </CardHeader>
          <CardContent>
            <Table
              columns={[
                { key: 'd', header: 'Descripción', render: (p: PlanPago) => p.descripcion },
                { key: 't', header: 'Total', render: (p: PlanPago) => formatMoney(p.total) },
                { key: 'c', header: 'Cuotas', render: (p: PlanPago) => p.cant_cuotas },
                { key: 'e', header: 'Estado', render: (p: PlanPago) => <Badge variant={p.estado === 'vigente' ? 'info' : 'neutral'}>{p.estado}</Badge> },
              ]}
              data={planesPago}
              keyExtractor={(p) => p.id}
              emptyMessage="—"
            />
          </CardContent>
        </Card>
      )}

      <Card padding="md">
        <CardHeader>
          <CardTitle>Movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table
            columns={[
              { key: 'fecha', header: 'Fecha', render: (m: Movimiento) => formatDateOnly(m.fecha) },
              {
                key: 'detalle',
                header: 'Detalle',
                render: (m: Movimiento) => (
                  <span>
                    {m.concepto ?? m.tipo}
                    {m.clase === 'pago' && m.medio_pago ? ` · ${m.medio_pago}` : ''}
                  </span>
                ),
              },
              {
                key: 'monto',
                header: 'Monto',
                render: (m: Movimiento) => (
                  <span className={m.clase === 'pago' ? 'text-green-600 dark:text-green-400' : ''}>
                    {m.clase === 'pago' ? '− ' : '+ '}
                    {formatMoney(m.monto)}
                  </span>
                ),
              },
              { key: 'estado', header: 'Estado', render: estadoMovBadge },
              {
                key: 'acc',
                header: '',
                render: (m: Movimiento) => (
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => anular(m)} disabled={pending}>
                    Anular
                  </Button>
                ),
              },
            ]}
            data={cuenta.movimientos}
            keyExtractor={(m) => m.id}
            emptyMessage="Sin movimientos"
          />
        </CardContent>
      </Card>

      {/* ---- Modal: Registrar pago ---- */}
      <Modal isOpen={modal === 'pago'} onClose={() => setModal(null)} title="Registrar pago" size="md">
        <form
          action={(fd) => run(() => registrarPagoAction(persona.id, null, fd))}
          className="space-y-4"
        >
          {formError && !fe && <Alert variant="danger">{formError.error}</Alert>}
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Se aplica a las deudas más viejas primero. Lo que sobre queda a favor del socio.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Monto *" name="monto" type="number" min="0" step="100" error={fe?.monto} required autoFocus />
            <Select label="Medio de pago *" name="medio_pago" defaultValue="efectivo" options={medioOptions} error={fe?.medio_pago} />
          </div>
          <Input label="Concepto (opcional)" name="concepto" placeholder="Ej: pago cuota septiembre" error={fe?.concepto} />
          <Input label="Comprobante (URL, opcional)" name="comprobante_url" placeholder="https://…" error={fe?.['comprobante_url']} />
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button type="submit" loading={pending}>Registrar pago</Button>
          </div>
        </form>
      </Modal>

      {/* ---- Modal: Registrar cargo ---- */}
      <Modal isOpen={modal === 'cargo'} onClose={() => setModal(null)} title="Registrar cargo" size="md">
        <form action={(fd) => run(() => registrarCargoAction(persona.id, null, fd))} className="space-y-4">
          {formError && !fe && <Alert variant="danger">{formError.error}</Alert>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Tipo *"
              name="tipo"
              defaultValue="venta"
              options={[
                { value: 'venta', label: 'Venta / fiado de kiosco' },
                { value: 'ajuste', label: 'Ajuste' },
                { value: 'pago_staff', label: 'Deuda a profesor / staff' },
              ]}
            />
            <Select
              label="Dirección *"
              name="direccion"
              defaultValue="ingreso"
              options={[
                { value: 'ingreso', label: 'Nos debe' },
                { value: 'egreso', label: 'Le debemos' },
              ]}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Monto *" name="monto" type="number" min="0" step="100" error={fe?.monto} required />
            <Input label="Vence el (opcional)" name="vence_el" type="date" error={fe?.['vence_el']} />
          </div>
          <Input label="Concepto *" name="concepto" placeholder="Ej: 2 gatorade, comisión clases…" error={fe?.concepto} required />
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button type="submit" loading={pending}>Registrar cargo</Button>
          </div>
        </form>
      </Modal>

      {/* ---- Modal: Plan de pago ---- */}
      <Modal isOpen={modal === 'plan'} onClose={() => setModal(null)} title="Generar plan de pago" size="md">
        <form action={(fd) => run(() => crearPlanPagoAction(persona.id, null, fd))} className="space-y-4">
          {formError && !fe && <Alert variant="danger">{formError.error}</Alert>}
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Divide una deuda en cuotas mensuales y las carga a la cuenta corriente.
          </p>
          <Input label="Descripción *" name="descripcion" placeholder="Ej: deuda 2025" error={fe?.descripcion} required />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Total *" name="total" type="number" min="0" step="100" error={fe?.total} required />
            <Input label="Cuotas *" name="cant_cuotas" type="number" min="1" max="60" defaultValue="3" error={fe?.['cant_cuotas']} required />
            <Input label="1er vencimiento *" name="primer_vencimiento" type="date" error={fe?.['primer_vencimiento']} required />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button type="submit" loading={pending}>Generar plan</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
