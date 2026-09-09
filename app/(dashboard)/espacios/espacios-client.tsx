'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Table } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { formatMoney } from '@/lib/format'
import type { Espacio, TipoEspacio } from '@/lib/types-supabase'
import { guardarEspacioAction, eliminarEspacioAction } from './actions'

const tiposOptions = [
  { value: 'futbol', label: 'Fútbol' },
  { value: 'padel', label: 'Pádel' },
  { value: 'tenis', label: 'Tenis' },
  { value: 'voley', label: 'Vóley' },
  { value: 'beach_voley', label: 'Beach vóley' },
  { value: 'otro', label: 'Otro' },
]
const tipoLabel = Object.fromEntries(tiposOptions.map((t) => [t.value, t.label]))

const estadosOptions = [
  { value: 'activa', label: 'Activa' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
]

const tipoBadge: Record<TipoEspacio, 'default' | 'success' | 'info' | 'warning'> = {
  futbol: 'success',
  padel: 'info',
  tenis: 'warning',
  voley: 'default',
  beach_voley: 'default',
  otro: 'default',
}

type FormError = { error: string; fieldErrors?: Record<string, string> }

export function EspaciosClient({ espacios }: { espacios: Espacio[] }) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Espacio | null>(null)
  const [formError, setFormError] = useState<FormError | null>(null)
  const [saving, startSave] = useTransition()
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, startDelete] = useTransition()

  const sectores = useMemo(() => {
    const map = new Map<string, Espacio[]>()
    for (const e of espacios) {
      const k = e.sector?.trim() || 'Sin sector'
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(e)
    }
    return [...map.entries()]
  }, [espacios])

  const sectoresExistentes = useMemo(
    () => [...new Set(espacios.map((e) => e.sector?.trim()).filter(Boolean))] as string[],
    [espacios]
  )

  function openNew() {
    setEditing(null)
    setFormError(null)
    setModalOpen(true)
  }
  function openEdit(e: Espacio) {
    setEditing(e)
    setFormError(null)
    setModalOpen(true)
  }

  function handleSubmit(formData: FormData) {
    setFormError(null)
    startSave(async () => {
      const res = await guardarEspacioAction(null, formData)
      if (res.ok) {
        setModalOpen(false)
        setEditing(null)
        router.refresh()
      } else {
        setFormError({ error: res.error, fieldErrors: res.fieldErrors })
      }
    })
  }

  function handleDelete(e: Espacio) {
    if (!confirm(`¿Eliminar la cancha "${e.nombre}"?`)) return
    setAviso(null)
    setDeletingId(e.id)
    startDelete(async () => {
      const res = await eliminarEspacioAction(e.id)
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
    { key: 'nombre', header: 'Cancha', render: (e: Espacio) => <span className="font-medium">{e.nombre}</span> },
    { key: 'tipo', header: 'Deporte', render: (e: Espacio) => <Badge variant={tipoBadge[e.tipo]}>{tipoLabel[e.tipo]}</Badge> },
    { key: 'precio', header: 'Precio/hora', render: (e: Espacio) => formatMoney(e.precio_por_hora) },
    {
      key: 'estado',
      header: 'Estado',
      render: (e: Espacio) =>
        e.estado === 'activa' ? <Badge variant="success">Activa</Badge> : <Badge variant="warning">Mantenimiento</Badge>,
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (e: Espacio) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => openEdit(e)}>
            Editar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600"
            loading={isDeleting && deletingId === e.id}
            onClick={() => handleDelete(e)}
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
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Espacios</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Canchas del complejo, agrupadas por sector</p>
        </div>
        <Button onClick={openNew}>Nueva cancha</Button>
      </div>

      {aviso && (
        <Alert variant={aviso.tipo === 'ok' ? 'success' : 'danger'} dismissible onDismiss={() => setAviso(null)}>
          {aviso.texto}
        </Alert>
      )}

      {espacios.length === 0 ? (
        <Card padding="md">
          <CardContent>
            <p className="text-center py-8 text-zinc-500 dark:text-zinc-400">
              Todavía no hay canchas cargadas.
            </p>
          </CardContent>
        </Card>
      ) : (
        sectores.map(([sector, lista]) => (
          <Card key={sector} padding="md">
            <CardHeader>
              <CardTitle>{sector}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table columns={columns} data={lista} keyExtractor={(e) => e.id} emptyMessage="—" />
            </CardContent>
          </Card>
        ))
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar cancha' : 'Nueva cancha'}
        size="md"
      >
        <form action={handleSubmit} className="space-y-4">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          {formError && !fieldErr && <Alert variant="danger">{formError.error}</Alert>}

          <Input label="Nombre *" name="nombre" defaultValue={editing?.nombre ?? ''} error={fieldErr?.nombre} placeholder="Pádel 1" required />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Deporte *" name="tipo" defaultValue={editing?.tipo ?? 'padel'} options={tiposOptions} />
            <Select label="Estado *" name="estado" defaultValue={editing?.estado ?? 'activa'} options={estadosOptions} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Precio por hora *"
              name="precio_por_hora"
              type="number"
              min="0"
              step="500"
              defaultValue={editing ? String(editing.precio_por_hora) : ''}
              error={fieldErr?.precio_por_hora}
              required
            />
            <Input
              label="Sector"
              name="sector"
              defaultValue={editing?.sector ?? ''}
              error={fieldErr?.sector}
              placeholder="Manzana A, Fondo…"
              list="sectores-existentes"
            />
          </div>
          <datalist id="sectores-existentes">
            {sectoresExistentes.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear cancha'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
