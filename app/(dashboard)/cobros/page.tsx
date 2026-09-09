'use client'

import { useState, useEffect, FormEvent } from 'react'
import { store } from '@/lib/store-supabase'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import type { Movimiento, Cuota, Persona, MedioPago, TipoMovimiento, Reserva, Espacio } from '@/lib/types-supabase'

const mediosOptions = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'mercadopago', label: 'MercadoPago' },
  { value: 'modo', label: 'MODO' },
  { value: 'debito_automatico', label: 'Débito automático' },
]

const mediosOptionsVenta = [...mediosOptions, { value: 'fiado', label: 'Fiado (pendiente de cobro)' }]

const tiposOptions = [
  { value: 'cuota', label: 'Cuota mensual' },
  { value: 'alquiler', label: 'Alquiler cancha' },
  { value: 'venta', label: 'Venta (kiosco/otros)' },
  { value: 'pago_staff', label: 'Pago a profesor/staff' },
]

const initialForm = {
  personaId: '',
  tipo: 'cuota' as TipoMovimiento,
  monto: '0',
  medioPago: 'efectivo' as MedioPago,
  cuotaId: '',
  reservaId: '',
  comprobanteUrl: '',
  concepto: '',
  estadoPagoStaff: 'pendiente' as 'pendiente' | 'pagado',
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value)
}

export default function CobrosPage() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [pendientes, setPendientes] = useState<Movimiento[]>([])
  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const [personas, setPersonas] = useState<Persona[]>([])
  const [personasStaff, setPersonasStaff] = useState<Persona[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [espacios, setEspacios] = useState<Espacio[]>([])
  const [activeTab, setActiveTab] = useState<'registrar' | 'historial' | 'cuotas' | 'cuenta_corriente'>('registrar')
  const [formData, setFormData] = useState(initialForm)
  const [errors, setErrors] = useState<Partial<typeof initialForm>>({})
  const [submitting, setSubmitting] = useState(false)
  const [saldandoId, setSaldandoId] = useState<string | null>(null)
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null)
  const [filterPersonaId, setFilterPersonaId] = useState('')
  const [filterTipo, setFilterTipo] = useState<TipoMovimiento | ''>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { refresh(); loadPersonas(); loadReservasYEspacios() }, [])

  const loadPersonas = async () => {
    try {
      const data = await store.getPersonas()
      setPersonas(data.filter(p => p.rol === 'socio' || p.rol === 'invitado'))
      setPersonasStaff(data.filter(p => p.rol === 'staff' || p.rol === 'profesor'))
    } catch (err) { console.error('Error loading personas:', err) }
  }

  const loadReservasYEspacios = async () => {
    try {
      const [reservasData, espaciosData] = await Promise.all([store.getReservas(), store.getEspacios()])
      setReservas(reservasData)
      setEspacios(espaciosData)
    } catch (err) { console.error('Error loading reservas/espacios:', err) }
  }

  const refresh = async () => {
    setLoading(true)
    try {
      const [movimientosData, pendientesData, cuotasData] = await Promise.all([
        store.getMovimientos({ personaId: filterPersonaId || undefined, tipo: filterTipo || undefined }),
        store.getMovimientos({ estado: 'pendiente' }),
        store.getCuotas({ estado: 'pendiente' }),
      ])
      setMovimientos(movimientosData)
      setPendientes(pendientesData)
      setCuotas(cuotasData)
    } catch (err) { console.error('Error loading cobros:', err) }
    finally { setLoading(false) }
  }

  const personaOptions = formData.tipo === 'pago_staff' ? personasStaff : personas

  const validate = (data: typeof formData) => {
    const newErrors: Partial<typeof formData> = {}
    if (!data.personaId) newErrors.personaId = 'Seleccionar persona'
    const monto = Number(data.monto)
    if (isNaN(monto) || monto <= 0) newErrors.monto = 'Monto debe ser mayor a 0'
    if (data.tipo === 'cuota' && !data.cuotaId) newErrors.cuotaId = 'Seleccionar cuota a pagar'
    if (data.tipo === 'alquiler' && !data.reservaId) newErrors.reservaId = 'Seleccionar reserva'
    if ((data.tipo === 'venta' || data.tipo === 'pago_staff') && !data.concepto.trim()) newErrors.concepto = 'Describir el concepto (ej: "1 coca", "comisión clases septiembre")'
    return newErrors
  }

  const handlePersonaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const personaId = e.target.value
    setFormData({ ...formData, personaId, cuotaId: '', reservaId: '' })
    const list = formData.tipo === 'pago_staff' ? personasStaff : personas
    setSelectedPersona(list.find(p => p.id === personaId) || null)
  }

  const handleTipoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tipo = e.target.value as TipoMovimiento
    setFormData({ ...formData, tipo, cuotaId: '', reservaId: '', personaId: '', medioPago: 'efectivo' })
    setSelectedPersona(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const newErrors = validate(formData)
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setSubmitting(true)
    try {
      const esEgreso = formData.tipo === 'pago_staff'
      const estado = esEgreso ? formData.estadoPagoStaff : (formData.medioPago === 'fiado' ? 'pendiente' : 'pagado')
      const movimientoData = {
        persona_id: formData.personaId,
        tipo: formData.tipo,
        monto: Number(formData.monto),
        medio_pago: formData.medioPago,
        cuota_id: formData.cuotaId || null,
        reserva_id: formData.reservaId || null,
        comprobante_url: formData.comprobanteUrl || null,
        concepto: formData.concepto || null,
        estado,
        direccion: esEgreso ? ('egreso' as const) : ('ingreso' as const),
        registrado_por: (await store.getUsuariosStaff())[0]?.id || 'system',
        fecha: new Date().toISOString(),
      }
      await store.addMovimiento(movimientoData)
      if (formData.tipo === 'cuota' && formData.cuotaId) await store.updateCuota(formData.cuotaId, { estado: 'pagada' })
      if (formData.tipo === 'alquiler' && formData.reservaId) await store.updateReserva(formData.reservaId, { sena_pagada: true, estado: 'confirmada' })
      refresh(); resetForm()
    } catch (err) { console.error('Error saving movimiento:', err) }
    finally { setSubmitting(false) }
  }

  const resetForm = () => { setFormData(initialForm); setErrors({}); setSelectedPersona(null) }

  const handleSaldar = async (m: Movimiento) => {
    setSaldandoId(m.id)
    try {
      await store.updateMovimiento(m.id, { estado: 'pagado', medio_pago: m.medio_pago === 'fiado' ? 'efectivo' : m.medio_pago })
      refresh()
    } catch (err) { console.error('Error saldando movimiento:', err) }
    finally { setSaldandoId(null) }
  }

  const getTipoBadge = (tipo: TipoMovimiento) => {
    const variants: Record<TipoMovimiento, 'info' | 'success' | 'warning' | 'danger'> = { cuota: 'info', alquiler: 'success', venta: 'warning', pago_staff: 'danger' }
    const labels: Record<TipoMovimiento, string> = { cuota: 'cuota', alquiler: 'alquiler', venta: 'venta', pago_staff: 'pago staff' }
    return <Badge variant={variants[tipo]}>{labels[tipo]}</Badge>
  }

  const getMedioBadge = (medio: MedioPago) => <Badge variant={medio === 'fiado' ? 'warning' : 'default'}>{medio}</Badge>

  const personaNombre = (id: string, lista: Persona[] = personas) => {
    const p = lista.find(pe => pe.id === id) || personasStaff.find(pe => pe.id === id)
    return p ? `${p.nombre} ${p.apellido}` : id
  }

  const columnsHistorial = [
    { key: 'fecha', header: 'Fecha', render: (m: Movimiento) => m.fecha.split('T')[0] },
    { key: 'persona', header: 'Persona', render: (m: Movimiento) => personaNombre(m.persona_id) },
    { key: 'tipo', header: 'Tipo', render: (m: Movimiento) => getTipoBadge(m.tipo) },
    { key: 'direccion', header: 'Dirección', render: (m: Movimiento) => <Badge variant={m.direccion === 'egreso' ? 'danger' : 'success'}>{m.direccion}</Badge> },
    { key: 'concepto', header: 'Concepto', render: (m: Movimiento) => m.concepto || <span className="text-zinc-400">—</span> },
    { key: 'monto', header: 'Monto', render: (m: Movimiento) => formatCurrency(m.monto) },
    { key: 'medio', header: 'Medio', render: (m: Movimiento) => getMedioBadge(m.medio_pago) },
    { key: 'estado', header: 'Estado', render: (m: Movimiento) => <Badge variant={m.estado === 'pagado' ? 'success' : 'warning'}>{m.estado}</Badge> },
    { key: 'comprobante', header: 'Comprobante', render: (m: Movimiento) => m.comprobante_url ? <a href={m.comprobante_url} target="_blank" className="text-blue-600 underline">Ver</a> : <span className="text-zinc-400">—</span> },
  ]

  const columnsCuotas = [
    { key: 'persona', header: 'Socio', render: (c: Cuota) => personaNombre(c.persona_id) },
    { key: 'periodo', header: 'Período', render: (c: Cuota) => c.periodo.slice(0, 7) },
    { key: 'monto', header: 'Monto', render: (c: Cuota) => formatCurrency(c.monto) },
    { key: 'estado', header: 'Estado', render: (c: Cuota) => <Badge variant={c.estado === 'pagada' ? 'success' : c.estado === 'vencida' ? 'danger' : 'warning'}>{c.estado}</Badge> },
    { key: 'vencimiento', header: 'Vence', render: (c: Cuota) => c.fecha_vencimiento },
    { key: 'actions', header: 'Acciones', render: (c: Cuota) => (
        <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); setActiveTab('registrar'); setFormData({ ...initialForm, personaId: c.persona_id, tipo: 'cuota', monto: String(c.monto), cuotaId: c.id }); setSelectedPersona(personas.find(p => p.id === c.persona_id) || null) }}>Cobrar</Button>
      ) },
  ]

  const columnsPendientes = [
    { key: 'fecha', header: 'Fecha', render: (m: Movimiento) => m.fecha.split('T')[0] },
    { key: 'direccion', header: 'Tipo', render: (m: Movimiento) => <Badge variant={m.direccion === 'egreso' ? 'danger' : 'warning'}>{m.direccion === 'egreso' ? 'a pagar' : 'nos deben'}</Badge> },
    { key: 'persona', header: 'Persona', render: (m: Movimiento) => personaNombre(m.persona_id) },
    { key: 'concepto', header: 'Concepto', render: (m: Movimiento) => m.concepto || getTipoBadge(m.tipo) },
    { key: 'monto', header: 'Monto', render: (m: Movimiento) => formatCurrency(m.monto) },
    { key: 'actions', header: 'Acciones', render: (m: Movimiento) => (
        <Button size="sm" variant="primary" loading={saldandoId === m.id} onClick={(e) => { e.stopPropagation(); handleSaldar(m) }}>
          {m.direccion === 'egreso' ? 'Marcar pagado' : 'Saldar (efectivo)'}
        </Button>
      ) },
  ]

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-4 border-zinc-900 border-t-transparent"></div></div>

  const saldoFiado = pendientes.filter(m => m.direccion === 'ingreso').reduce((s, m) => s + m.monto, 0)
  const saldoStaff = pendientes.filter(m => m.direccion === 'egreso').reduce((s, m) => s + m.monto, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Cobros</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Registro de pagos, cuotas, fiados y pagos a staff</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="registrar">Registrar Cobro</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
          <TabsTrigger value="cuotas">Cuotas Pendientes</TabsTrigger>
          <TabsTrigger value="cuenta_corriente">Cuenta Corriente</TabsTrigger>
        </TabsList>

        <TabsContent value="registrar">
          <Card padding="md">
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select label="Tipo de cobro *" value={formData.tipo} onChange={handleTipoChange} options={tiposOptions} placeholder="Seleccionar tipo" required />
                <Select label="Persona *" value={formData.personaId} onChange={handlePersonaChange} options={personaOptions.map(p => ({ value: p.id, label: `${p.nombre} ${p.apellido} (${p.rol})` }))} placeholder={formData.tipo === 'pago_staff' ? 'Buscar staff/profesor' : 'Buscar socio/invitado'} error={errors.personaId} required />
                <Select
                  label="Medio de pago *"
                  value={formData.medioPago}
                  onChange={e => setFormData({ ...formData, medioPago: e.target.value as MedioPago })}
                  options={formData.tipo === 'venta' ? mediosOptionsVenta : mediosOptions}
                  placeholder="Seleccionar medio"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Monto *" type="number" min="0" step="100" value={formData.monto} onChange={e => setFormData({ ...formData, monto: e.target.value })} error={errors.monto} required />
                {formData.tipo === 'pago_staff' && (
                  <Select label="Estado *" value={formData.estadoPagoStaff} onChange={e => setFormData({ ...formData, estadoPagoStaff: e.target.value as 'pendiente' | 'pagado' })} options={[{ value: 'pendiente', label: 'Pendiente (se le debe)' }, { value: 'pagado', label: 'Ya pagado' }]} />
                )}
              </div>

              {formData.tipo === 'cuota' && selectedPersona && (
                <Select label="Cuota a pagar" value={formData.cuotaId} onChange={e => setFormData({ ...formData, cuotaId: e.target.value, monto: String(cuotas.find(c => c.id === e.target.value)?.monto || 0) })} options={cuotas.filter(c => c.persona_id === selectedPersona.id).map(c => ({ value: c.id, label: `${c.periodo.slice(0,7)} - ${formatCurrency(c.monto)} (${c.estado})` }))} placeholder="Seleccionar cuota pendiente" error={errors.cuotaId} required />
              )}

              {formData.tipo === 'alquiler' && selectedPersona && (
                <Select label="Reserva a pagar" value={formData.reservaId} onChange={e => setFormData({ ...formData, reservaId: e.target.value, monto: String(reservas.find(r => r.id === e.target.value)?.precio || 0) })} options={reservas.filter(r => r.persona_id === selectedPersona.id && r.estado === 'pendiente_pago').map(r => ({ value: r.id, label: `${espacios.find(e => e.id === r.espacio_id)?.nombre} ${r.fecha} ${r.hora_inicio}-${r.hora_fin} - ${formatCurrency(r.precio)}` }))} placeholder="Seleccionar reserva pendiente" error={errors.reservaId} required />
              )}

              {(formData.tipo === 'venta' || formData.tipo === 'pago_staff') && (
                <Input label="Concepto *" value={formData.concepto} onChange={e => setFormData({ ...formData, concepto: e.target.value })} error={errors.concepto} placeholder={formData.tipo === 'venta' ? 'Ej: 1 coca, sanguche, paleta' : 'Ej: comisión clases septiembre'} required />
              )}

              <Input label="Comprobante (URL opcional)" value={formData.comprobanteUrl} onChange={e => setFormData({ ...formData, comprobanteUrl: e.target.value })} placeholder="https://..." />

              {selectedPersona && (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                  <p className="font-medium">{selectedPersona.nombre} {selectedPersona.apellido}</p>
                  <p className="text-sm text-zinc-500">DNI: {selectedPersona.dni} · {selectedPersona.email}</p>
                  <div className="mt-2 flex gap-2">
                    <Badge variant={selectedPersona.estado === 'activo' ? 'success' : selectedPersona.estado === 'moroso' ? 'danger' : 'default'}>{selectedPersona.estado}</Badge>
                  </div>
                </div>
              )}

              {formData.tipo === 'venta' && formData.medioPago === 'fiado' && (
                <p className="text-sm text-amber-600 dark:text-amber-400">Esta venta queda registrada como pendiente de cobro en "Cuenta Corriente" hasta que se salde.</p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <Button type="button" variant="secondary" onClick={resetForm}>Limpiar</Button>
                <Button onClick={(e) => handleSubmit(e as unknown as FormEvent)} loading={submitting}>Registrar cobro</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historial">
          <Card padding="md">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>Historial de Movimientos</CardTitle>
              <div className="flex gap-2">
                <Select value={filterPersonaId} onChange={(e) => { setFilterPersonaId(e.target.value); refresh(); }} options={[{ value: '', label: 'Todas las personas' }, ...[...personas, ...personasStaff].map(p => ({ value: p.id, label: `${p.nombre} ${p.apellido}` }))]} placeholder="Filtrar persona" className="w-56" />
                <Select value={filterTipo} onChange={(e) => { setFilterTipo(e.target.value as TipoMovimiento | ''); refresh(); }} options={[{ value: '', label: 'Todos los tipos' }, ...tiposOptions]} placeholder="Filtrar tipo" className="w-48" />
              </div>
            </CardHeader>
            <CardContent>
              <Table columns={columnsHistorial} data={movimientos} keyExtractor={m => m.id} emptyMessage="No hay movimientos registrados" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cuotas">
          <Card padding="md">
            <CardHeader>
              <CardTitle>Cuotas Pendientes de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <Table columns={columnsCuotas} data={cuotas} keyExtractor={c => c.id} emptyMessage="No hay cuotas pendientes" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cuenta_corriente">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Card padding="md"><CardContent><p className="text-sm text-zinc-500">Fiado pendiente de cobro</p><p className="text-2xl font-bold text-amber-600">{formatCurrency(saldoFiado)}</p></CardContent></Card>
            <Card padding="md"><CardContent><p className="text-sm text-zinc-500">Pendiente de pagar a staff</p><p className="text-2xl font-bold text-rose-600">{formatCurrency(saldoStaff)}</p></CardContent></Card>
          </div>
          <Card padding="md">
            <CardHeader>
              <CardTitle>Cuenta Corriente — Pendientes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table columns={columnsPendientes} data={pendientes} keyExtractor={m => m.id} emptyMessage="No hay fiados ni pagos a staff pendientes" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
