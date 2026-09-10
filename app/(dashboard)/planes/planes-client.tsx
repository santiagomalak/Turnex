'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Table } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { formatMoney } from '@/lib/format'
import type { PlanMembresia } from '@/lib/types'
import { guardarPlanAction, eliminarPlanAction } from './actions'

type FormError = { error: string; fieldErrors?: Record<string, string> }

export function PlanesClient({ planes }: { planes: PlanMembresia[] }) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PlanMembresia | null>(null)
  const [formError, setFormError] = useState<FormError | null>(null)
  const [saving, startSave] = useTransition()
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, startDelete] = useTransition()

  function openNew() {
    setEditing(null)
    setFormError(null)
    setModalOpen(true)
  }
  function openEdit(p: PlanMembresia) {
    setEditing(p)
    setFormError(null)
    setModalOpen(true)
  }

  function handleSubmit(formData: FormData) {
    setFormError(null)
    startSave(async () => {
      const res = await guardarPlanAction(null, formData)
      if (res.ok) {
        setModalOpen(false)
        setEditing(null)
        router.refresh()
      } else {
        setFormError({ error: res.error, fieldErrors: res.fieldErrors })
      }
    })
  }

  function handleDelete(p: PlanMembresia) {
    if (!confirm(`¿Eliminar el plan "${p.nombre}"?`)) return
    setAviso(null)
    setDeletingId(p.id)
    startDelete(async () => {
      const res = await eliminarPlanAction(p.id)
      setDeletingId(null)
      if (res.ok) {
        setAviso({ tipo: 'ok', texto: res.data.mensaje })
        router.refresh()
      } else {
        setAviso({ tipo: 'error', texto: res.error })
      }
    })
  }

  const fieldErr = formError?.fieldErrors

  const columns = [
    { key: 'nombre', header: 'Plan', render: (p: PlanMembresia) => <span className="font-medium">{p.nombre}</span> },
    { key: 'precio', header: 'Precio mensual', render: (p: PlanMembresia) => formatMoney(p.precio_mensual) },
    {
      key: 'canchas',
      header: 'Incluye canchas',
      render: (p: PlanMembresia) =>
        p.incluye_canchas ? <Badge variant="success">Sí</Badge> : <Badge variant="neutral">No</Badge>,
    },
    {
      key: 'desc',
      header: 'Descuento',
      render: (p: PlanMembresia) => (p.descuento_porcentaje > 0 ? `${p.descuento_porcentaje}%` : '—'),
    },
    {
      key: 'activo',
      header: 'Estado',
      render: (p: PlanMembresia) =>
        p.activo ? <Badge variant="success">Activo</Badge> : <Badge variant="neutral">Retirado</Badge>,
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (p: PlanMembresia) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
            Editar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600"
            loading={isDeleting && deletingId === p.id}
            onClick={() => handleDelete(p)}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Planes de membresía</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Categorías de socio y su precio mensual</p>
        </div>
        <Button onClick={openNew}>Nuevo plan</Button>
      </div>

      {aviso && (
        <Alert variant={aviso.tipo === 'ok' ? 'success' : 'danger'} dismissible onDismiss={() => setAviso(null)}>
          {aviso.texto}
        </Alert>
      )}

      <Card padding="md">
        <CardContent>
          <Table columns={columns} data={planes} keyExtractor={(p) => p.id} emptyMessage="No hay planes cargados" />
        </CardContent>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar plan' : 'Nuevo plan'}
        size="md"
      >
        <form action={handleSubmit} className="space-y-4">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          {formError && !fieldErr && <Alert variant="danger">{formError.error}</Alert>}

          <Input label="Nombre *" name="nombre" defaultValue={editing?.nombre ?? ''} error={fieldErr?.nombre} placeholder="Full, Social, Solo pádel…" required />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Precio mensual *"
              name="precio_mensual"
              type="number"
              min="0"
              step="500"
              defaultValue={editing ? String(editing.precio_mensual) : ''}
              error={fieldErr?.precio_mensual}
              required
            />
            <Input
              label="Descuento en canchas (%)"
              name="descuento_porcentaje"
              type="number"
              min="0"
              max="100"
              step="5"
              defaultValue={editing ? String(editing.descuento_porcentaje) : '0'}
              error={fieldErr?.descuento_porcentaje}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="incluye_canchas" defaultChecked={editing?.incluye_canchas ?? false} className="rounded border-zinc-300" />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Incluye uso de canchas sin cargo</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="activo" defaultChecked={editing?.activo ?? true} className="rounded border-zinc-300" />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Plan activo (se puede asignar a nuevos socios)</span>
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear plan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
