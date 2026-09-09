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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import type { Espacio, TipoEspacio, EstadoEspacio, Reserva } from '@/lib/types-supabase'

const tiposOptions = [
  { value: 'futbol', label: 'Fútbol' },
  { value: 'padel', label: 'Pádel' },
  { value: 'tenis', label: 'Tenis' },
  { value: 'voley', label: 'Vóley' },
  { value: 'beach_voley', label: 'Beach vóley' },
  { value: 'otro', label: 'Otro' },
]

const estadosOptions = [
  { value: 'activa', label: 'Activa' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
]

const initialForm = {
  nombre: '',
  tipo: 'futbol' as TipoEspacio,
  precio_por_hora: '0',
  estado: 'activa' as EstadoEspacio,
}

const HORARIOS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00']
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function formatDate(date: Date) { return date.toISOString().split('T')[0] }
function addDays(date: Date, days: number) { const d = new Date(date); d.setDate(d.getDate() + days); return d }

export default function EspaciosPage() {
  const [espacios, setEspacios] = useState<Espacio[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [activeTab, setActiveTab] = useState<'lista' | 'calendario'>('lista')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEspacio, setEditingEspacio] = useState<Espacio | null>(null)
  const [formData, setFormData] = useState(initialForm)
  const [errors, setErrors] = useState<Partial<typeof initialForm>>({})
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState(() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d; })

  useEffect(() => { refresh() }, [])

  const refresh = async () => {
    setLoading(true)
    try {
      const [espaciosData, reservasData] = await Promise.all([store.getEspacios(), store.getReservas()])
      setEspacios(espaciosData)
      setReservas(reservasData)
    } catch (err) { console.error('Error loading espacios:', err) }
    finally { setLoading(false) }
  }

  const validate = (data: typeof formData) => {
    const newErrors: Partial<typeof formData> = {}
    if (!data.nombre.trim()) newErrors.nombre = 'Nombre requerido'
    const precio = Number(data.precio_por_hora)
    if (isNaN(precio) || precio <= 0) newErrors.precio_por_hora = 'Precio debe ser mayor a 0'
    return newErrors
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const newErrors = validate(formData)
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setSubmitting(true)
    try {
      const data = { ...formData, precio_por_hora: Number(formData.precio_por_hora) }
      if (editingEspacio) await store.updateEspacio(editingEspacio.id, data)
      else await store.addEspacio(data)
      refresh(); closeModal()
    } finally { setSubmitting(false) }
  }

  const openModal = (espacio?: Espacio) => {
    if (espacio) { setEditingEspacio(espacio); setFormData({ ...espacio, precio_por_hora: String(espacio.precio_por_hora) }) }
    else { setEditingEspacio(null); setFormData(initialForm) }
    setErrors({}); setIsModalOpen(true)
  }

  const closeModal = () => { setIsModalOpen(false); setEditingEspacio(null); setFormData(initialForm); setErrors({}) }

  const handleDelete = async (id: string) => { if (confirm('¿Eliminar esta cancha? Se borrarán sus reservas.')) { try { await store.deleteEspacio(id); refresh() } catch (err) { console.error('Error deleting espacio:', err) } } }

  const getTipoBadge = (tipo: TipoEspacio) => {
    const variants: Record<TipoEspacio, 'default' | 'success' | 'info' | 'warning'> = { futbol: 'success', padel: 'info', tenis: 'warning', voley: 'default', beach_voley: 'default', otro: 'default' }
    return <Badge variant={variants[tipo]}>{tipo.replace('_', ' ')}</Badge>
  }

  const getEstadoBadge = (estado: EstadoEspacio) => <Badge variant={estado === 'activa' ? 'success' : 'warning'}>{estado}</Badge>

  const columns = [
    { key: 'nombre', header: 'Nombre', render: (e: Espacio) => <span className="font-medium">{e.nombre}</span> },
    { key: 'tipo', header: 'Tipo', render: (e: Espacio) => getTipoBadge(e.tipo) },
    { key: 'precio_por_hora', header: 'Precio/hr', render: (e: Espacio) => `$${e.precio_por_hora.toLocaleString('es-AR')}` },
    { key: 'estado', header: 'Estado', render: (e: Espacio) => getEstadoBadge(e.estado) },
    { key: 'actions', header: 'Acciones', render: (e: Espacio) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={(ev) => { ev.stopPropagation(); openModal(e); }}>Editar</Button>
          <Button size="sm" variant="ghost" onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id); }} className="text-red-600">Eliminar</Button>
        </div>
      ) },
  ]

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const getReservasForSlot = (espacioId: string, fecha: string, hora: string) => {
    return reservas.find(r => r.espacio_id === espacioId && r.fecha === fecha && r.hora_inicio <= hora && r.hora_fin > hora && r.estado !== 'cancelada')
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-4 border-zinc-900 border-t-transparent"></div></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Espacios</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Canchas y espacios deportivos</p>
        </div>
        <Button onClick={() => openModal()}>Nuevo Espacio</Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'lista' | 'calendario')} className="w-full">
        <TabsList>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="calendario">Calendario Semanal</TabsTrigger>
        </TabsList>

        <TabsContent value="lista">
          <Card padding="md">
            <CardContent>
              <Table columns={columns} data={espacios} keyExtractor={e => e.id} emptyMessage="No hay espacios registrados" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendario">
          <Card padding="md">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>Disponibilidad Semanal</CardTitle>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>&#60; Semana anterior</Button>
                <span className="font-medium text-zinc-900 dark:text-white">
                  {weekDays[0].toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} - {weekDays[6].toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>Semana siguiente &#62;</Button>
                <Button variant="secondary" size="sm" onClick={() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); setWeekStart(d); }}>Hoy</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-800">
                      <th className="w-24 p-2 text-center font-medium text-zinc-700 dark:text-zinc-300 border-r border-zinc-200 dark:border-zinc-700">Hora</th>
                      {weekDays.map((day, dayIdx) => (
                        <th key={dayIdx} className="w-32 p-2 text-center font-medium text-zinc-700 dark:text-zinc-300 border-r border-zinc-200 dark:border-zinc-700">
                          {DIAS_SEMANA[day.getDay()]}<br/>
                          <span className="text-xs font-normal text-zinc-500">{day.getDate()}/{day.getMonth() + 1}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {HORARIOS.map((hora, hIdx) => (
                      <tr key={hora} className={hIdx % 2 === 1 ? 'bg-zinc-50/50 dark:bg-zinc-800/50' : ''}>
                        <td className="p-2 text-center text-zinc-600 dark:text-zinc-400 border-r border-zinc-200 dark:border-zinc-700 font-mono">{hora}</td>
                        {weekDays.map((day, dayIdx) => {
                          const fecha = formatDate(day)
                          const espaciosActivos = espacios.filter(e => e.estado === 'activa')
                          return (
                            <td key={dayIdx} className="p-1 border-r border-zinc-200 dark:border-zinc-700 min-h-[60px] relative">
                              {espaciosActivos.map(espacio => {
                                const reserva = getReservasForSlot(espacio.id, fecha, hora)
                                if (!reserva) return null
                                return (
                                  <div
                                    key={reserva.id}
                                    className={`absolute inset-x-0.5 top-0.5 bottom-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 p-1 truncate cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors ${reserva.estado === 'pendiente_pago' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' : ''}`}
                                    title={`Reserva ${reserva.estado === 'pendiente_pago' ? '⏳' : '✓'}`}
                                  >
                                    {reserva.estado === 'pendiente_pago' ? '⏳' : '✓'}
                                  </div>
                                )
                              })}
                              {espaciosActivos.every(e => !getReservasForSlot(e.id, fecha, hora)) && (
                                <div className="absolute inset-x-0.5 top-0.5 bottom-0.5 rounded border border-dashed border-zinc-300 dark:border-zinc-600" />
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-900/30 border border-blue-300" /> Confirmada</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/30 border border-amber-300" /> Pendiente pago</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-dashed border-zinc-300" /> Libre</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingEspacio ? 'Editar Espacio' : 'Nuevo Espacio'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre *" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} error={errors.nombre} placeholder="Cancha Fútbol 1" required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Tipo *" value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value as TipoEspacio })} options={tiposOptions} placeholder="Seleccionar tipo" />
            <Input label="Precio por hora *" type="number" min="0" step="100" value={formData.precio_por_hora} onChange={e => setFormData({ ...formData, precio_por_hora: e.target.value })} error={errors.precio_por_hora} placeholder="8000" required />
          </div>
          <Select label="Estado *" value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value as EstadoEspacio })} options={estadosOptions} placeholder="Seleccionar estado" />
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" loading={submitting}>{editingEspacio ? 'Guardar cambios' : 'Crear espacio'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}