'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { formatMoney } from '@/lib/format'
import { reservarSocioAction } from './actions'

const HORAS = Array.from({ length: 15 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`)
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

type Espacio = { id: string; nombre: string; tipo: string; precioPorHora: number }
type Ocupado = { espacioId: string; fecha: string; horaInicio: string; horaFin: string }

function addDays(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)
}

export function ReservarClient({
  espacios,
  ocupados,
  incluyeCanchas,
  descuento,
}: {
  espacios: Espacio[]
  ocupados: Ocupado[]
  incluyeCanchas: boolean
  descuento: number
}) {
  const router = useRouter()
  const [canchaId, setCanchaId] = useState(espacios[0]?.id ?? '')
  const [pre, setPre] = useState<{ fecha: string; hora: string } | null>(null)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [pending, start] = useTransition()

  const cancha = espacios.find((e) => e.id === canchaId)
  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(i)), [])

  const precio = useMemo(() => {
    if (!cancha) return 0
    if (incluyeCanchas) return 0
    const base = cancha.precioPorHora
    return descuento > 0 ? Math.round(base * (1 - descuento / 100)) : base
  }, [cancha, incluyeCanchas, descuento])

  function libre(fecha: string, hora: string): boolean {
    return !ocupados.some(
      (o) => o.espacioId === canchaId && o.fecha === fecha && o.horaInicio <= hora && o.horaFin > hora
    )
  }

  function confirmar() {
    if (!pre || !cancha) return
    const fd = new FormData()
    fd.set('espacio_id', canchaId)
    fd.set('fecha', pre.fecha)
    fd.set('hora_inicio', pre.hora)
    fd.set('hora_fin', `${String(Number(pre.hora.slice(0, 2)) + 1).padStart(2, '0')}:00`)
    setAviso(null)
    start(async () => {
      const res = await reservarSocioAction(null, fd)
      if (res.ok) {
        setPre(null)
        setAviso({
          tipo: 'ok',
          texto:
            res.data.precio > 0
              ? `Reserva confirmada. Se cargaron ${formatMoney(res.data.precio)} a tu cuenta.`
              : 'Reserva confirmada. Sin cargo (tu plan incluye canchas).',
        })
        router.refresh()
      } else {
        setPre(null)
        setAviso({ tipo: 'error', texto: res.error })
      }
    })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Reservar cancha</h1>

      {aviso && (
        <Alert variant={aviso.tipo === 'ok' ? 'success' : 'danger'} dismissible onDismiss={() => setAviso(null)}>
          {aviso.texto}
        </Alert>
      )}

      <Select
        value={canchaId}
        onChange={(e) => setCanchaId(e.target.value)}
        options={espacios.map((e) => ({ value: e.id, label: `${e.nombre} — ${formatMoney(e.precioPorHora)}/h` }))}
      />

      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {incluyeCanchas
          ? 'Tu plan incluye el uso de canchas, sin cargo.'
          : `Se cobra ${formatMoney(precio)} por turno${descuento > 0 ? ` (con tu ${descuento}% de descuento)` : ''}, a tu cuenta corriente.`}
      </p>

      <div className="space-y-3">
        {dias.map((fecha, i) => {
          const disponibles = HORAS.filter((h) => libre(fecha, h))
          return (
            <Card key={fecha} padding="md">
              <CardContent>
                <p className="text-sm font-medium text-zinc-900 dark:text-white mb-2">
                  {DIAS[new Date(fecha + 'T00:00:00Z').getUTCDay()]} {fecha.slice(8)}/{fecha.slice(5, 7)}
                  {i === 0 && <span className="text-zinc-400 font-normal"> · hoy</span>}
                </p>
                {disponibles.length === 0 ? (
                  <p className="text-sm text-zinc-400">Sin horarios libres</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {disponibles.map((h) => (
                      <button
                        key={h}
                        onClick={() => setPre({ fecha, hora: h })}
                        className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Modal isOpen={!!pre} onClose={() => setPre(null)} title="Confirmar reserva" size="sm">
        {pre && cancha && (
          <div className="space-y-4">
            <div className="text-sm space-y-1">
              <p><span className="text-zinc-500">Cancha:</span> {cancha.nombre}</p>
              <p><span className="text-zinc-500">Día:</span> {pre.fecha.slice(8)}/{pre.fecha.slice(5, 7)}</p>
              <p><span className="text-zinc-500">Hora:</span> {pre.hora} – {String(Number(pre.hora.slice(0, 2)) + 1).padStart(2, '0')}:00</p>
              <p><span className="text-zinc-500">Cargo:</span> {precio > 0 ? `${formatMoney(precio)} a tu cuenta` : 'sin cargo'}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPre(null)}>Cancelar</Button>
              <Button onClick={confirmar} loading={pending}>Confirmar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
