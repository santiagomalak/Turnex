'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Alert } from '@/components/ui/Alert'
import { Modal } from '@/components/ui/Modal'
import { formatMoney, formatDate } from '@/lib/format'
import type { Persona } from '@/lib/types'
import { aprobarSocioAction, rechazarSocioAction } from './actions'

type PlanOpt = { id: string; nombre: string; precio: number }

const mesActual = () => {
  const d = new Date()
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export function SociosPendientesClient({
  pendientes,
  planes,
}: {
  pendientes: Persona[]
  planes: PlanOpt[]
}) {
  const router = useRouter()
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [aprobar, setAprobar] = useState<Persona | null>(null)
  const [rechazar, setRechazar] = useState<Persona | null>(null)
  const [planId, setPlanId] = useState('')
  const [generarCuota, setGenerarCuota] = useState(true)
  const [pending, start] = useTransition()

  function abrirAprobar(p: Persona) {
    setAviso(null)
    setPlanId(planes[0]?.id ?? '')
    setGenerarCuota(true)
    setAprobar(p)
  }

  function confirmarAprobar() {
    if (!aprobar || !planId) return
    start(async () => {
      const res = await aprobarSocioAction({
        personaId: aprobar.id,
        planId,
        generarPrimeraCuota: generarCuota,
      })
      if (res.ok) {
        setAprobar(null)
        setAviso({
          tipo: 'ok',
          texto: res.data.cuotaGenerada
            ? `${aprobar.nombre} ${aprobar.apellido} quedó activo y se le generó la cuota de ${mesActual()}.`
            : `${aprobar.nombre} ${aprobar.apellido} quedó activo.`,
        })
        router.refresh()
      } else {
        setAviso({ tipo: 'error', texto: res.error })
      }
    })
  }

  function confirmarRechazar() {
    if (!rechazar) return
    const p = rechazar
    start(async () => {
      const res = await rechazarSocioAction(p.id)
      if (res.ok) {
        setRechazar(null)
        setAviso({ tipo: 'ok', texto: `Se rechazó la solicitud de ${p.nombre} ${p.apellido}.` })
        router.refresh()
      } else {
        setAviso({ tipo: 'error', texto: res.error })
      }
    })
  }

  const planSel = planes.find((p) => p.id === planId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Solicitudes de socios</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
          Altas que llegaron por el portal y esperan aprobación
        </p>
      </div>

      {aviso && (
        <Alert
          variant={aviso.tipo === 'ok' ? 'success' : 'danger'}
          dismissible
          onDismiss={() => setAviso(null)}
        >
          {aviso.texto}
        </Alert>
      )}

      {pendientes.length === 0 ? (
        <Card padding="md">
          <CardContent>
            <p className="text-center py-8 text-zinc-500 dark:text-zinc-400">
              No hay solicitudes pendientes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pendientes.map((p) => (
            <Card key={p.id} padding="md">
              <CardContent>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-white">
                      {p.nombre} {p.apellido}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      DNI {p.dni ?? '—'}
                      {p.email ? ` · ${p.email}` : ''}
                      {p.telefono ? ` · ${p.telefono}` : ''}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Se registró el {formatDate(p.fecha_alta)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" onClick={() => abrirAprobar(p)} disabled={pending}>
                      Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() => {
                        setAviso(null)
                        setRechazar(p)
                      }}
                      disabled={pending}
                    >
                      Rechazar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ---- Aprobar ---- */}
      <Modal
        isOpen={aprobar !== null}
        onClose={() => setAprobar(null)}
        title={aprobar ? `Aprobar a ${aprobar.nombre} ${aprobar.apellido}` : ''}
        size="md"
      >
        <div className="space-y-4">
          {planes.length === 0 ? (
            <Alert variant="warning">
              No hay planes de membresía activos. Creá uno en <strong>Planes</strong> antes de
              aprobar socios.
            </Alert>
          ) : (
            <>
              <Select
                label="Plan de membresía *"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                options={planes.map((p) => ({
                  value: p.id,
                  label: `${p.nombre} — ${formatMoney(p.precio)}/mes`,
                }))}
              />
              <label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={generarCuota}
                  onChange={(e) => setGenerarCuota(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Generar la cuota de {mesActual()} ahora
                  {planSel ? ` (${formatMoney(planSel.precio)})` : ''}
                </span>
              </label>
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <Button type="button" variant="secondary" onClick={() => setAprobar(null)}>
                  Cancelar
                </Button>
                <Button onClick={confirmarAprobar} loading={pending} disabled={!planId}>
                  Aprobar socio
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ---- Rechazar ---- */}
      <Modal
        isOpen={rechazar !== null}
        onClose={() => setRechazar(null)}
        title="Rechazar solicitud"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Se va a borrar la solicitud y la cuenta de acceso de{' '}
            <strong>
              {rechazar?.nombre} {rechazar?.apellido}
            </strong>
            . Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <Button type="button" variant="secondary" onClick={() => setRechazar(null)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarRechazar}
              loading={pending}
              className="bg-red-600 hover:bg-red-700"
            >
              Rechazar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
