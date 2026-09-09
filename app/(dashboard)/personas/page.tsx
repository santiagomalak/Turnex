'use client'

import { useState, useEffect, FormEvent } from 'react'
import { store } from '@/lib/store-supabase'
import { Table } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import type { Persona, RolPersona, EstadoPersona } from '@/lib/types-supabase'

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
]

const initialForm = {
  nombre: '',
  apellido: '',
  dni: '',
  email: '',
  telefono: '',
  rol: 'socio' as RolPersona,
  estado: 'activo' as EstadoPersona,
  plan_membresia_id: null as string | null,
}

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null)
  const [formData, setFormData] = useState(initialForm)
  const [errors, setErrors] = useState<Partial<typeof initialForm>>({})
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { refresh() }, [])

  const refresh = async () => {
    setLoading(true)
    try {
      const data = await store.getPersonas()
      setPersonas(data)
    } catch (err) {
      console.error('Error loading personas:', err)
    } finally {
      setLoading(false)
    }
  }

  const validate = (data: typeof formData) => {
    const newErrors: Partial<typeof formData> = {}
    if (!data.nombre.trim()) newErrors.nombre = 'Nombre requerido'
    if (!data.apellido.trim()) newErrors.apellido = 'Apellido requerido'
    if (!data.dni.trim()) newErrors.dni = 'DNI requerido'
    else if (!/^\d{7,8}$/.test(data.dni)) newErrors.dni = 'DNI inválido (7-8 dígitos)'
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) newErrors.email = 'Email inválido'
    if (data.telefono && !/^[\d\s\-\(\)]{10,}$/.test(data.telefono)) newErrors.telefono = 'Teléfono inválido'
    return newErrors
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const newErrors = validate(formData)
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setSubmitting(true)
    try {
      if (editingPersona) {
        await store.updatePersona(editingPersona.id, formData)
      } else {
        const existing = personas.find(p => p.dni === formData.dni)
        if (existing) { setErrors({ dni: 'Ya existe una persona con este DNI' }); setSubmitting(false); return }
        await store.addPersona({ ...formData, fecha_alta: new Date().toISOString() })
      }
      refresh()
      closeModal()
    } catch (err) {
      console.error('Error saving persona:', err)
      setErrors({ dni: 'Error al guardar' })
    } finally {
      setSubmitting(false)
    }
  }

  const openModal = (persona?: Persona) => {
    if (persona) { setEditingPersona(persona); setFormData({ ...persona, dni: persona.dni ?? '', email: persona.email ?? '', telefono: persona.telefono ?? '' }) }
    else { setEditingPersona(null); setFormData(initialForm) }
    setErrors({}); setIsModalOpen(true)
  }

  const closeModal = () => { setIsModalOpen(false); setEditingPersona(null); setFormData(initialForm); setErrors({}) }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta persona? Se borrarán sus reservas, cuotas y pagos asociados.')) return
    try { await store.deletePersona(id); refresh() } catch (err) { console.error('Error deleting persona:', err) }
  }

  const getRolBadge = (rol: RolPersona) => {
    const variants: Record<RolPersona, 'default' | 'success' | 'info' | 'warning'> = { socio: 'success', invitado: 'info', staff: 'default', profesor: 'warning' }
    return <Badge variant={variants[rol]}>{rol}</Badge>
  }

  const getEstadoBadge = (estado: EstadoPersona) => {
    const variants: Record<EstadoPersona, 'success' | 'neutral' | 'danger'> = { activo: 'success', inactivo: 'neutral', moroso: 'danger' }
    return <Badge variant={variants[estado]}>{estado}</Badge>
  }

  const columns = [
    { key: 'nombre', header: 'Nombre', render: (p: Persona) => <span className="font-medium">{p.nombre} {p.apellido}</span> },
    { key: 'dni', header: 'DNI' },
    { key: 'email', header: 'Email', render: (p: Persona) => p.email || <span className="text-zinc-400">—</span> },
    { key: 'telefono', header: 'Teléfono', render: (p: Persona) => p.telefono || <span className="text-zinc-400">—</span> },
    { key: 'rol', header: 'Rol', render: (p: Persona) => getRolBadge(p.rol) },
    { key: 'estado', header: 'Estado', render: (p: Persona) => getEstadoBadge(p.estado) },
    { key: 'fechaAlta', header: 'Alta', render: (p: Persona) => p.fecha_alta.split('T')[0] },
    { key: 'actions', header: 'Acciones', render: (p: Persona) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openModal(p); }}>Editar</Button>
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} className="text-red-600">Eliminar</Button>
        </div>
      ) },
  ]

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-4 border-zinc-900 border-t-transparent"></div></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Personas</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Socios, invitados, staff y profesores</p>
        </div>
        <Button onClick={() => openModal()}>Nueva Persona</Button>
      </div>

      <Card padding="md">
        <CardContent>
          <Table columns={columns} data={personas} keyExtractor={p => p.id} emptyMessage="No hay personas registradas" />
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingPersona ? 'Editar Persona' : 'Nueva Persona'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nombre *" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} error={errors.nombre} placeholder="Juan" required />
            <Input label="Apellido *" value={formData.apellido} onChange={e => setFormData({ ...formData, apellido: e.target.value })} error={errors.apellido} placeholder="Pérez" required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="DNI *" value={formData.dni} onChange={e => setFormData({ ...formData, dni: e.target.value })} error={errors.dni} placeholder="30123456" required />
            <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} error={errors.email} placeholder="juan@email.com" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Teléfono" value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} error={errors.telefono} placeholder="11-4444-1111" />
            <Select label="Rol *" value={formData.rol} onChange={e => setFormData({ ...formData, rol: e.target.value as RolPersona })} options={rolesOptions} placeholder="Seleccionar rol" />
          </div>
          <Select label="Estado *" value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value as EstadoPersona })} options={estadosOptions} placeholder="Seleccionar estado" />
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" loading={submitting}>{editingPersona ? 'Guardar cambios' : 'Crear persona'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}