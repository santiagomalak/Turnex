'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Table } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import type { Persona, PlanMembresia, RolPersona, EstadoPersona } from '@/lib/types-supabase'
import { guardarPersonaAction, eliminarPersonaAction } from './actions'

const rolesOptions = [
  { value: 'socio', label: 'Socio' },
  { value: 'invitado', label: 'Invitado' },
  { value: 'staff', label: 'Staff' },
  { value: 'profesor', label: 'Profesor' },
]

const estadosOptions = [
  { value: 'activo', label: 'Activo' },
  { value: 'inactivo', label: 'Inactivo' },
  { value: 'moroso', label: 'Moroso' },
  { value: 'pendiente_aprobacion', label: 'Pendiente de aprobación' },
]

const rolBadge: Record<RolPersona, 'default' | 'success' | 'info' | 'warning'> = {
  socio: 'success',
  invitado: 'info',
  staff: 'default',
  profesor: 'warning',
}

const estadoBadge: Record<EstadoPersona, 'success' | 'neutral' | 'danger' | 'warning'> = {
  activo: 'success',
  inactivo: 'neutral',
  moroso: 'danger',
  pendiente_aprobacion: 'warning',
}

export function PersonasClient({
  personas,
  planes,
}: {
  personas: Persona[]
  planes: PlanMembresia[]
}) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Persona | null>(null)
  const [rol, setRol] = useState<RolPersona>('socio')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, startDelete] = useTransition()

  const [state, formAction, pending] = useActionState(guardarPersonaAction, null)

  useEffect(() => {
    if (state?.ok) {
      setModalOpen(false)
      setEditing(null)
      router.refresh()
    }
  }, [state, router])

  const planNombre = (id: string | null) =>
    planes.find((p) => p.id === id)?.nombre ?? '—'

  function openNew() {
    setEditing(null)
    setRol('socio')
    setModalOpen(true)
  }

  function openEdit(p: Persona) {
    setEditing(p)
    setRol(p.rol)
    setModalOpen(true)
  }

  function handleDelete(p: Persona) {
    if (!confirm(`¿Eliminar a ${p.nombre} ${p.apellido}? Se borran sus reservas, cuotas y pagos.`)) return
    setDeleteError(null)
    setDeletingId(p.id)
    startDelete(async () => {
      const res = await eliminarPersonaAction(p.id)
      setDeletingId(null)
      if (res.ok) router.refresh()
      else setDeleteError(res.error)
    })
  }

  const fieldErr = state && !state.ok ? state.fieldErrors : undefined

  const columns = [
    {
      key: 'nombre',
      header: 'Nombre',
      render: (p: Persona) => (
        <span className="font-medium">
          {p.nombre} {p.apellido}
        </span>
      ),
    },
    { key: 'dni', header: 'DNI', render: (p: Persona) => p.dni || <span className="text-zinc-400">—</span> },
    { key: 'email', header: 'Email', render: (p: Persona) => p.email || <span className="text-zinc-400">—</span> },
    { key: 'telefono', header: 'Teléfono', render: (p: Persona) => p.telefono || <span className="text-zinc-400">—</span> },
    { key: 'rol', header: 'Rol', render: (p: Persona) => <Badge variant={rolBadge[p.rol]}>{p.rol}</Badge> },
    {
      key: 'plan',
      header: 'Plan',
      render: (p: Persona) => (p.rol === 'socio' ? planNombre(p.plan_membresia_id) : <span className="text-zinc-400">—</span>),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (p: Persona) => <Badge variant={estadoBadge[p.estado]}>{p.estado.replace(/_/g, ' ')}</Badge>,
    },
    { key: 'alta', header: 'Alta', render: (p: Persona) => p.fecha_alta.split('T')[0] },
    {
      key: 'actions',
      header: 'Acciones',
      render: (p: Persona) => (
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
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Personas</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Socios, invitados, staff y profesores</p>
        </div>
        <Button onClick={openNew}>Nueva Persona</Button>
      </div>

      {deleteError && (
        <Alert variant="danger" dismissible onDismiss={() => setDeleteError(null)}>
          {deleteError}
        </Alert>
      )}

      <Card padding="md">
        <CardContent>
          <Table
            columns={columns}
            data={personas}
            keyExtractor={(p) => p.id}
            emptyMessage="No hay personas registradas"
          />
        </CardContent>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar persona' : 'Nueva persona'}
        size="lg"
      >
        <form action={formAction} className="space-y-4">
          {editing && <input type="hidden" name="id" value={editing.id} />}

          {state && !state.ok && !state.fieldErrors && (
            <Alert variant="danger">{state.error}</Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nombre *" name="nombre" defaultValue={editing?.nombre ?? ''} error={fieldErr?.nombre} placeholder="Juan" required />
            <Input label="Apellido *" name="apellido" defaultValue={editing?.apellido ?? ''} error={fieldErr?.apellido} placeholder="Pérez" required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="DNI" name="dni" defaultValue={editing?.dni ?? ''} error={fieldErr?.dni} placeholder="30123456" inputMode="numeric" />
            <Input label="Email" name="email" type="email" defaultValue={editing?.email ?? ''} error={fieldErr?.email} placeholder="juan@email.com" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Teléfono" name="telefono" defaultValue={editing?.telefono ?? ''} error={fieldErr?.telefono} placeholder="11-4444-1111" />
            <Select
              label="Rol *"
              name="rol"
              value={rol}
              onChange={(e) => setRol(e.target.value as RolPersona)}
              options={rolesOptions}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Estado *"
              name="estado"
              defaultValue={editing?.estado ?? 'activo'}
              options={estadosOptions}
              error={fieldErr?.estado}
            />
            {rol === 'socio' && (
              <Select
                label="Plan de membresía"
                name="plan_membresia_id"
                defaultValue={editing?.plan_membresia_id ?? ''}
                options={[{ value: '', label: 'Sin plan' }, ...planes.map((p) => ({ value: p.id, label: p.nombre }))]}
                error={fieldErr?.plan_membresia_id}
              />
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending}>
              {editing ? 'Guardar cambios' : 'Crear persona'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
