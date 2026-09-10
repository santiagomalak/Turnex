'use client'

import { useMemo, useState, useTransition } from 'react'
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
import type { Espacio, Persona } from '@/lib/types-supabase'
import type { ReservaConDetalle } from '@/lib/repos/reserva'
import { crearReservaAction, cancelarReservaAction, marcarEstadoReservaAction } from './actions'

const HORAS = Array.from({ length: 16 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`)
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const medioOptions = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'mercadopago', label: 'MercadoPago' },
  { value: 'modo', label: 'MODO' },
  { value: 'debito_automatico', label: 'Débito automático' },
]

type FormError = { error: string; fieldErrors?: Record<string, string> }
type RunResult =
  | { ok: true; data?: { precio?: number; cobrado?: boolean; aCuentaCorriente?: boolean } }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

function addDays(iso: string, n: number): string {
  return new Date(new Date(iso + 'T00:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10)
}

export function ReservasClient({
  reservas,
  espacios,
  personas,
  semana,
  canchaId,
}: {
  reservas: ReservaConDetalle[]
  espacios: Espacio[]
  personas: Persona[]
  semana: string
  canchaId: string
}) {
  const router = useRouter()
  const activas = useMemo(() => espacios.filter((e) => e.estado === 'activa'), [espacios])
  const canchaSel = useMemo(
    () => canchaId || activas[0]?.id || '',
    [canchaId, activas]
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [pre, setPre] = useState<{ fecha: string; hora: string; espacioId: string } | null>(null)
  const [formError, setFormError] = useState<FormError | null>(null)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [pending, start] = useTransition()
  const [personaRol, setPersonaRol] = useState<string>('')

  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(semana, i)), [semana])
  const reservasCancha = useMemo(
    () => reservas.filter((r) => r.espacio_id === canchaSel && r.estado !== 'cancelada'),
    [reservas, canchaSel]
  )

  function navegar(params: Record<string, string>) {
    const usp = new URLSearchParams({ semana, cancha: canchaSel, ...params })
    router.push(`/reservas?${usp.toString()}`)
  }

  function reservaEn(fecha: string, hora: string) {
    return reservasCancha.find((r) => r.fecha === fecha && r.hora_inicio <= hora && r.hora_fin > hora)
  }

  function abrirNueva(fecha?: string, hora?: string) {
    setPre(fecha && hora ? { fecha, hora, espacioId: canchaSel } : null)
    setFormError(null)
    setPersonaRol('')
    setModalOpen(true)
  }

  function run(fn: () => Promise<RunResult>) {
    setFormError(null)
    start(async () => {
      const res = await fn()
      if (res.ok) {
        setModalOpen(false)
        if (res.data?.aCuentaCorriente) {
          setAviso({ tipo: 'ok', texto: `Reserva confirmada. ${formatMoney(res.data.precio ?? 0)} cargados a la cuenta corriente.` })
        } else if (res.data?.cobrado) {
          setAviso({ tipo: 'ok', texto: `Reserva confirmada y cobrada (${formatMoney(res.data.precio ?? 0)}).` })
        } else {
          setAviso({ tipo: 'ok', texto: 'Reserva confirmada.' })
        }
        router.refresh()
      } else {
        setFormError({ error: res.error, fieldErrors: res.fieldErrors })
      }
    })
  }

  function accionReserva(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setAviso(null)
    start(async () => {
      const res = await fn()
      if (res.ok) router.refresh()
      else setAviso({ tipo: 'error', texto: res.error ?? 'Error' })
    })
  }

  const fe = formError?.fieldErrors
  const esNoSocio = personaRol === 'invitado'

  const estadoBadge = (e: string) => {
    const map: Record<string, 'success' | 'warning' | 'neutral' | 'danger'> = {
      confirmada: 'success',
      pendiente_pago: 'warning',
      cumplida: 'neutral',
      ausente: 'danger',
      cancelada: 'danger',
    }
    return <Badge variant={map[e] ?? 'neutral'}>{e.replace('_', ' ')}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Reservas</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Calendario de canchas por semana</p>
        </div>
        <Button onClick={() => abrirNueva()}>Nueva reserva</Button>
      </div>

      {aviso && (
        <Alert variant={aviso.tipo === 'ok' ? 'success' : 'danger'} dismissible onDismiss={() => setAviso(null)}>
          {aviso.texto}
        </Alert>
      )}

      <Card padding="md">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => navegar({ semana: addDays(semana, -7) })}>‹</Button>
            <span className="text-sm font-medium">
              {formatDateOnly(dias[0])} – {formatDateOnly(dias[6])}
            </span>
            <Button size="sm" variant="outline" onClick={() => navegar({ semana: addDays(semana, 7) })}>›</Button>
            <Button size="sm" variant="secondary" onClick={() => navegar({ semana: new Date().toISOString().slice(0, 10) })}>Hoy</Button>
          </div>
          <Select
            value={canchaSel}
            onChange={(e) => navegar({ cancha: e.target.value })}
            options={activas.map((e) => ({ value: e.id, label: `${e.nombre} · ${formatMoney(e.precio_por_hora)}/h` }))}
            className="sm:w-64"
          />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800">
                  <th className="w-16 p-2 border-r border-zinc-200 dark:border-zinc-700">Hora</th>
                  {dias.map((d, i) => (
                    <th key={d} className="p-2 border-r border-zinc-200 dark:border-zinc-700 font-medium">
                      {DIAS[i]}<br />
                      <span className="font-normal text-zinc-500">{d.slice(8)}/{d.slice(5, 7)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HORAS.map((hora) => (
                  <tr key={hora}>
                    <td className="p-2 text-center font-mono text-zinc-500 border-r border-zinc-200 dark:border-zinc-700">{hora}</td>
                    {dias.map((fecha) => {
                      const r = reservaEn(fecha, hora)
                      if (r && r.hora_inicio === hora) {
                        const span = Math.max(1, Math.round((Number(r.hora_fin.slice(0, 2)) - Number(r.hora_inicio.slice(0, 2)))))
                        return (
                          <td
                            key={fecha}
                            rowSpan={span}
                            className={`p-1 border-r border-zinc-200 dark:border-zinc-700 align-top ${
                              r.origen === 'abono'
                                ? 'bg-purple-100 dark:bg-purple-900/30'
                                : r.estado === 'pendiente_pago'
                                ? 'bg-amber-100 dark:bg-amber-900/30'
                                : 'bg-green-100 dark:bg-green-900/30'
                            }`}
                          >
                            <div className="font-medium truncate">{r.persona_nombre} {r.persona_apellido}</div>
                            <div className="text-zinc-500">{r.hora_inicio}–{r.hora_fin}{r.origen === 'abono' ? ' · abono' : ''}</div>
                          </td>
                        )
                      }
                      if (r) return null
                      return (
                        <td
                          key={fecha}
                          className="p-1 border-r border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                          onClick={() => abrirNueva(fecha, hora)}
                        >
                          <div className="h-6" />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30" /> confirmada</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/30" /> pendiente de pago</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-100 dark:bg-purple-900/30" /> abono (turno fijo)</span>
          </div>
        </CardContent>
      </Card>

      <Card padding="md">
        <CardHeader>
          <CardTitle>Reservas de la semana</CardTitle>
        </CardHeader>
        <CardContent>
          <Table
            columns={[
              { key: 'f', header: 'Fecha', render: (r: ReservaConDetalle) => `${formatDateOnly(r.fecha)} ${r.hora_inicio}` },
              { key: 'c', header: 'Cancha', render: (r: ReservaConDetalle) => r.espacio_nombre },
              { key: 'p', header: 'Persona', render: (r: ReservaConDetalle) => `${r.persona_nombre} ${r.persona_apellido}` },
              { key: 'precio', header: 'Precio', render: (r: ReservaConDetalle) => (r.precio > 0 ? formatMoney(r.precio) : 'incluido') },
              { key: 'e', header: 'Estado', render: (r: ReservaConDetalle) => estadoBadge(r.estado) },
              {
                key: 'acc',
                header: '',
                render: (r: ReservaConDetalle) =>
                  ['cancelada', 'cumplida', 'ausente'].includes(r.estado) ? null : (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" disabled={pending} onClick={() => accionReserva(() => marcarEstadoReservaAction(r.id, 'cumplida'))}>Vino</Button>
                      <Button size="sm" variant="ghost" disabled={pending} onClick={() => accionReserva(() => marcarEstadoReservaAction(r.id, 'ausente'))}>No vino</Button>
                      <Button size="sm" variant="ghost" className="text-red-600" disabled={pending} onClick={() => confirm('¿Cancelar la reserva?') && accionReserva(() => cancelarReservaAction(r.id))}>Cancelar</Button>
                    </div>
                  ),
              },
            ]}
            data={reservas}
            keyExtractor={(r) => r.id}
            emptyMessage="Sin reservas esta semana"
          />
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nueva reserva" size="md">
        <form action={(fd) => run(() => crearReservaAction(null, fd))} className="space-y-4">
          {formError && !fe && <Alert variant="danger">{formError.error}</Alert>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Cancha *" name="espacio_id" defaultValue={pre?.espacioId ?? canchaSel} options={activas.map((e) => ({ value: e.id, label: e.nombre }))} error={fe?.espacio_id} />
            <Select
              label="Persona *"
              name="persona_id"
              defaultValue=""
              onChange={(e) => setPersonaRol(personas.find((p) => p.id === e.target.value)?.rol ?? '')}
              options={[{ value: '', label: 'Elegir…' }, ...personas.map((p) => ({ value: p.id, label: `${p.nombre} ${p.apellido} (${p.rol})` }))]}
              error={fe?.persona_id}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Fecha *" name="fecha" type="date" defaultValue={pre?.fecha ?? new Date().toISOString().slice(0, 10)} error={fe?.fecha} required />
            <Select label="Desde *" name="hora_inicio" defaultValue={pre?.hora ?? '18:00'} options={HORAS.map((h) => ({ value: h, label: h }))} error={fe?.hora_inicio} />
            <Select label="Hasta *" name="hora_fin" defaultValue={pre?.hora ? HORAS[Math.min(HORAS.length - 1, HORAS.indexOf(pre.hora) + 1)] : '19:00'} options={HORAS.map((h) => ({ value: h, label: h }))} error={fe?.hora_fin} />
          </div>

          {esNoSocio && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 space-y-3">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                No es socio: se cobra el 100% de la cancha al reservar.
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="cobrar_ahora" defaultChecked className="rounded border-zinc-300" />
                Cobrar ahora
              </label>
              <Select label="Medio de pago" name="medio_pago" defaultValue="efectivo" options={medioOptions} />
            </div>
          )}
          {personaRol === 'socio' && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Socio: la reserva se confirma y el alquiler va a su cuenta corriente.
            </p>
          )}

          <Input label="Notas (opcional)" name="notas" error={fe?.notas} />

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={pending}>Confirmar reserva</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
