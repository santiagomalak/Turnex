'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Table } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import type { Persona, PlanMembresia, RolPersona, EstadoPersona } from '@/lib/types'
import { guardarPersonaAction, eliminarPersonaAction } from './actions'
import { useToast } from '@/hooks/useToast'

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

type FormError = { error: string; fieldErrors?: Record<string, string> }

export function PersonasClient({
  personas,
  planes,
}: {
  personas: Persona[]
  planes: PlanMembresia[]
}) {
  const router = useRouter()
  const { success } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Persona | null>(null)
  const [rol, setRol] = useState<RolPersona>('socio')
  const [formError, setFormError] = useState<FormError | null>(null)
  const [saving, startSave] = useTransition()

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, startDelete] = useTransition()

  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState<RolPersona | ''>('')

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return personas.filter((p) => {
      if (filtroRol && p.rol !== filtroRol) return false
      if (!q) return true
      return (
        `${p.nombre} ${p.apellido}`.toLowerCase().includes(q) ||
        (p.dni ?? '').includes(q) ||
        (p.email ?? '').toLowerCase().includes(q)
      )
    })
  }, [personas, busqueda, filtroRol])

  const planNombre = (id: string | null) => planes.find((p) => p.id === id)?.nombre ?? '—'

  function openNew() {
    setEditing(null)
    setRol('socio')
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(p: Persona) {
    setEditing(p)
    setRol(p.rol)
    setFormError(null)
    setModalOpen(true)
  }

  function handleSubmit(formData: FormData) {
    setFormError(null)
    startSave(async () => {
      const res = await guardarPersonaAction(null, formData)
      if (res.ok) {
        setModalOpen(false)
        setEditing(null)
        success(editing ? 'Persona actualizada' : 'Persona creada')
        router.refresh()
      } else {
        setFormError({ error: res.error, fieldErrors: res.fieldErrors })
      }
    })
  }

  function handleDelete(p: Persona) {
    if (!confirm(`¿Eliminar a ${p.nombre} ${p.apellido}? Se borran sus reservas, cuotas y pagos.`)) return
    setDeleteError(null)
    setDeletingId(p.id)
    startDelete(async () => {
      const res = await eliminarPersonaAction(p.id)
      setDeletingId(null)
      if (res.ok) {
        success('Persona eliminada')
        router.refresh()
      } else {
        setDeleteError(res.error)
      }
    })
  }

  const fieldErr = formError?.fieldErrors

  const columns = [
    {
      key: 'nombre',
      header: 'Nombre',
      render: (p: Persona) => (
        <Link href={`/personas/${p.id}`} className="font-medium text-zinc-900 dark:text-white hover:underline">
          {p.nombre} {p.apellido}
        </Link>
      ),
    },
    { key: 'dni', header: 'DNI', render: (p: Persona) => p.dni || <span className="text-zinc-400">—</span> },
    { key: 'email', header: 'Email', render: (p: Persona) => p.email || <span className="text-zinc-400">—</span> },
    { key: 'telefono', header: 'Teléfono', render: (p: Persona) => p.telefono || <span className="text-zinc-400">—</span> },
    { key: 'rol', header: 'Rol', render: (p: Persona) => <Badge variant={rolBadge[p.rol]}>{p.rol}</Badge> },
    {
      key: 'plan',
      header: 'Plan',
      render: (p: Persona) =>
        p.rol === 'socio' ? planNombre(p.plan_membresia_id) : <span className="text-zinc-400">—</span>,
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
          <Button size="sm" variant="ghost" onClick={() => router.push(`/personas/${p.id}`)}>
            Ficha
          </Button>
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
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Buscar por nombre, DNI o email…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value as RolPersona | '')}
              options={[{ value: '', label: 'Todos los roles' }, ...rolesOptions]}
              className="sm:w-48"
            />
            <span className="text-sm text-zinc-500 dark:text-zinc-400 self-center">
              {visibles.length} de {personas.length}
            </span>
          </div>
          <Table
            columns={columns}
            data={visibles}
            keyExtractor={(p) => p.id}
            emptyMessage="Ninguna persona coincide con la búsqueda"
          />
        </CardContent>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar persona' : 'Nueva persona'}
        size="lg"
      >
        <form action={handleSubmit} className="space-y-4">
          {editing && <input type="hidden" name="id" value={editing.id} />}

          {formError && !fieldErr && <Alert variant="danger">{formError.error}</Alert>}

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
            <Button type="submit" loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear persona'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
