'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Alert } from '@/components/ui/Alert'
import { formatMoney } from '@/lib/format'
import type { Espacio, Persona } from '@/lib/types'
import type { AbonoConDetalle } from '@/lib/repos/abono'
import { crearAbonoAction, cambiarEstadoAbonoAction } from './actions'

const DIAS = [
  { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' },
  { value: '3', label: 'Miércoles' },
  { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' },
  { value: '6', label: 'Sábado' },
  { value: '0', label: 'Domingo' },
]
const DIA_LABEL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const HORAS = Array.from({ length: 16 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`)

type FormError = { error: string; fieldErrors?: Record<string, string> }

export function AbonosClient({
  abonos,
  espacios,
  personas,
}: {
  abonos: AbonoConDetalle[]
  espacios: Espacio[]
  personas: Persona[]
}) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [formError, setFormError] = useState<FormError | null>(null)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [pending, start] = useTransition()

  function crear(fd: FormData) {
    setFormError(null)
    start(async () => {
      const res = await crearAbonoAction(null, fd)
      if (res.ok) {
        setModalOpen(false)
        const c = res.data.reservasConflicto
        setAviso({
          tipo: 'ok',
          texto: `Abono creado. ${res.data.reservasCreadas} turnos generados${c ? `, ${c} con conflicto de horario (revisá el calendario)` : ''}.`,
        })
        router.refresh()
      } else {
        setFormError({ error: res.error, fieldErrors: res.fieldErrors })
      }
    })
  }

  function cambiarEstado(id: string, estado: 'activo' | 'pausado' | 'cancelado') {
    setAviso(null)
    start(async () => {
      const res = await cambiarEstadoAbonoAction(id, estado)
      if (res.ok) router.refresh()
      else setAviso({ tipo: 'error', texto: res.error })
    })
  }

  const fe = formError?.fieldErrors

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Abonos</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Turnos fijos semanales con cuota mensual</p>
        </div>
        <Button onClick={() => { setFormError(null); setModalOpen(true) }}>Nuevo abono</Button>
      </div>

      {aviso && (
        <Alert variant={aviso.tipo === 'ok' ? 'success' : 'danger'} dismissible onDismiss={() => setAviso(null)}>
          {aviso.texto}
        </Alert>
      )}

      <Card padding="md">
        <CardContent>
          <Table
            columns={[
              { key: 'p', header: 'Persona', render: (a: AbonoConDetalle) => `${a.persona_nombre} ${a.persona_apellido}` },
              { key: 'c', header: 'Cancha', render: (a: AbonoConDetalle) => a.espacio_nombre },
              {
                key: 'turno',
                header: 'Turno',
                render: (a: AbonoConDetalle) => `${DIA_LABEL[a.dia_semana]} ${a.hora_inicio}–${a.hora_fin}`,
              },
              { key: 'precio', header: 'Cuota mensual', render: (a: AbonoConDetalle) => formatMoney(a.precio_mensual) },
              {
                key: 'e',
                header: 'Estado',
                render: (a: AbonoConDetalle) => (
                  <Badge variant={a.estado === 'activo' ? 'success' : a.estado === 'pausado' ? 'warning' : 'neutral'}>
                    {a.estado}
                  </Badge>
                ),
              },
              {
                key: 'acc',
                header: '',
                render: (a: AbonoConDetalle) =>
                  a.estado === 'cancelado' ? null : (
                    <div className="flex gap-1">
                      {a.estado === 'activo' ? (
                        <Button size="sm" variant="ghost" disabled={pending} onClick={() => cambiarEstado(a.id, 'pausado')}>Pausar</Button>
                      ) : (
                        <Button size="sm" variant="ghost" disabled={pending} onClick={() => cambiarEstado(a.id, 'activo')}>Reactivar</Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        disabled={pending}
                        onClick={() => confirm('¿Cancelar el abono? Los turnos ya generados quedan.') && cambiarEstado(a.id, 'cancelado')}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ),
              },
            ]}
            data={abonos}
            keyExtractor={(a) => a.id}
            emptyMessage="No hay abonos cargados"
          />
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo abono" size="md">
        <form action={crear} className="space-y-4">
          {formError && !fe && <Alert variant="danger">{formError.error}</Alert>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Persona *"
              name="persona_id"
              defaultValue=""
              options={[{ value: '', label: 'Elegir…' }, ...personas.map((p) => ({ value: p.id, label: `${p.nombre} ${p.apellido}` }))]}
              error={fe?.persona_id}
            />
            <Select
              label="Cancha *"
              name="espacio_id"
              defaultValue={espacios[0]?.id ?? ''}
              options={espacios.map((e) => ({ value: e.id, label: e.nombre }))}
              error={fe?.espacio_id}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select label="Día *" name="dia_semana" defaultValue="1" options={DIAS} error={fe?.dia_semana} />
            <Select label="Desde *" name="hora_inicio" defaultValue="19:00" options={HORAS.map((h) => ({ value: h, label: h }))} error={fe?.hora_inicio} />
            <Select label="Hasta *" name="hora_fin" defaultValue="20:00" options={HORAS.map((h) => ({ value: h, label: h }))} error={fe?.hora_fin} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Cuota mensual *" name="precio_mensual" type="number" min="0" step="500" error={fe?.precio_mensual} required />
            <Input label="Vigente desde *" name="vigente_desde" type="date" defaultValue={new Date().toISOString().slice(0, 10)} error={fe?.vigente_desde} required />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Se generan las próximas 8 semanas de turnos y se carga la primera cuota mensual a la cuenta corriente.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={pending}>Crear abono</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
