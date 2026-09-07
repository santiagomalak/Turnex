'use client';

import { useState, useEffect, FormEvent } from 'react';
import { store, type Reserva, type EstadoReserva, type Persona, type Espacio } from '@/lib/store';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { formatDate, addDays } from '@/lib/store';

const estadosOptions = [
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'pendiente_pago', label: 'Pendiente pago' },
  { value: 'cancelada', label: 'Cancelada' },
];

const initialForm = {
  espacioId: '',
  personaId: '',
  fecha: formatDate(new Date()),
  horaInicio: '10:00',
  horaFin: '11:00',
  estado: 'pendiente_pago' as EstadoReserva,
  precio: 0,
  senaPagada: false,
};

const HORARIOS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

export default function ReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [filterFecha, setFilterFecha] = useState(formatDate(new Date()));
  const [filterEspacioId, setFilterEspacioId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReserva, setEditingReserva] = useState<Reserva | null>(null);
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState<Partial<typeof initialForm>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showConflicts, setShowConflicts] = useState<Reserva[]>([]);

  useEffect(() => { refresh(); }, []);
  useEffect(() => { setPersonas(store.getPersonas().filter(p => p.rol === 'socio' || p.rol === 'invitado')); }, []);
  useEffect(() => { setEspacios(store.getEspacios().filter(e => e.estado === 'activa')); }, []);

  const refresh = () => { setReservas(store.getReservas({ fecha: filterFecha, espacioId: filterEspacioId || undefined })); };

  const validate = (data: typeof formData) => {
    const newErrors: Partial<typeof formData> = {};
    if (!data.espacioId) newErrors.espacioId = 'Seleccionar espacio';
    if (!data.personaId) newErrors.personaId = 'Seleccionar persona';
    if (!data.fecha) newErrors.fecha = 'Fecha requerida';
    if (!data.horaInicio || !data.horaFin) newErrors.horaInicio = 'Horario requerido';
    if (data.horaInicio >= data.horaFin) newErrors.horaFin = 'Hora fin debe ser posterior a hora inicio';
    if (data.precio <= 0) newErrors.precio = 'Precio inválido';
    return newErrors;
  };

  const checkConflicts = (data: typeof formData, excludeId?: string) => {
    return store.getReservas({ fecha: data.fecha, espacioId: data.espacioId }).filter(r => 
      r.id !== excludeId && r.estado !== 'cancelada' &&
      !(data.horaFin <= r.horaInicio || data.horaInicio >= r.horaFin)
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const conflicts = checkConflicts(formData, editingReserva?.id);
    if (conflicts.length > 0) { setShowConflicts(conflicts); return; }
    const newErrors = validate(formData);
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setSubmitting(true);
    try {
      if (editingReserva) store.updateReserva(editingReserva.id, formData);
      else store.addReserva(formData);
      refresh(); closeModal();
    } catch (err) { setErrors({ horaInicio: (err as Error).message }); }
    finally { setSubmitting(false); }
  };

  const openModal = (reserva?: Reserva) => {
    if (reserva) { setEditingReserva(reserva); setFormData({ ...reserva }); }
    else { 
      setEditingReserva(null); 
      const espacio = espacios[0];
      setFormData({ ...initialForm, espacioId: espacio?.id || '', precio: espacio?.precioPorHora || 0 });
    }
    setErrors({}); setShowConflicts([]); setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingReserva(null); setFormData(initialForm); setErrors({}); setShowConflicts([]); };

  const handleDelete = (id: string) => { if (confirm('¿Eliminar esta reserva?')) { store.deleteReserva(id); refresh(); } };

  const getEstadoBadge = (estado: EstadoReserva) => {
    const variants: Record<EstadoReserva, 'success' | 'warning' | 'danger'> = { confirmada: 'success', pendiente_pago: 'warning', cancelada: 'danger' };
    return <Badge variant={variants[estado]}>{estado.replace('_', ' ')}</Badge>;
  };

  const handleEspacioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const espacio = espacios.find(es => es.id === e.target.value);
    setFormData({ ...formData, espacioId: e.target.value, precio: espacio?.precioPorHora || 0 });
  };

  const columns = [
    { key: 'hora', header: 'Hora', render: (r: Reserva) => `${r.horaInicio} - ${r.horaFin}` },
    { key: 'espacio', header: 'Espacio', render: (r: Reserva) => { const e = espacios.find(es => es.id === r.espacioId); return e?.nombre || r.espacioId; } },
    { key: 'persona', header: 'Persona', render: (r: Reserva) => { const p = personas.find(pe => pe.id === r.personaId); return p ? `${p.nombre} ${p.apellido}` : r.personaId; } },
    { key: 'estado', header: 'Estado', render: (r: Reserva) => getEstadoBadge(r.estado) },
    { key: 'precio', header: 'Precio', render: (r: Reserva) => `$${r.precio.toLocaleString('es-AR')}` },
    { key: 'sena', header: 'Seña', render: (r: Reserva) => r.senaPagada ? <Badge variant="success">Pagada</Badge> : <Badge variant="warning">Pendiente</Badge> },
    { key: 'actions', header: 'Acciones', render: (r: Reserva) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={(ev) => { ev.stopPropagation(); openModal(r); }}>Editar</Button>
          <Button size="sm" variant="ghost" onClick={(ev) => { ev.stopPropagation(); handleDelete(r.id); }} className="text-red-600">Eliminar</Button>
        </div>
      ) },
  ];

  const today = formatDate(new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Reservas</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Calendario de reservas de canchas</p>
        </div>
        <Button onClick={() => openModal()}>Nueva Reserva</Button>
      </div>

      <Card padding="md">
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Input label="Fecha" type="date" value={filterFecha} onChange={e => { setFilterFecha(e.target.value); refresh(); }} className="w-48" />
            <Select
              value={filterEspacioId}
              onChange={e => { setFilterEspacioId(e.target.value); refresh(); }}
              options={[{ value: '', label: 'Todas las canchas' }, ...espacios.map(e => ({ value: e.id, label: e.nombre }))]}
              placeholder="Filtrar por cancha"
              className="w-56"
            />
            <div className="flex items-end">
              <Button variant="outline" onClick={() => { setFilterFecha(today); refresh(); }}>Hoy</Button>
            </div>
          </div>

          {showConflicts.length > 0 && (
            <Alert variant="danger" title="Conflicto de horario" className="text-sm">
              <p>El espacio ya está reservado en ese horario:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                {showConflicts.map(c => (
                  <li key={c.id}>
                    {c.horaInicio} - {c.horaFin} ({c.estado}) - {store.getPersona(c.personaId)?.nombre}
                  </li>
                ))}
              </ul>
              <Button variant="ghost" size="sm" onClick={() => setShowConflicts([])}>Entendido</Button>
            </Alert>
          )}

          <Table columns={columns} data={reservas} keyExtractor={r => r.id} emptyMessage={`No hay reservas para ${filterFecha}`} />
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingReserva ? 'Editar Reserva' : 'Nueva Reserva'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Cancha *" value={formData.espacioId} onChange={handleEspacioChange} options={espacios.map(e => ({ value: e.id, label: `${e.nombre} (${e.tipo}) - $${e.precioPorHora}/hr` }))} placeholder="Seleccionar cancha" required />
            <Select label="Persona *" value={formData.personaId} onChange={e => setFormData({ ...formData, personaId: e.target.value })} options={personas.map(p => ({ value: p.id, label: `${p.nombre} ${p.apellido} (${p.rol})` }))} placeholder="Seleccionar persona" required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Fecha *" type="date" value={formData.fecha} onChange={e => setFormData({ ...formData, fecha: e.target.value })} error={errors.fecha} required />
            <Select label="Hora inicio *" value={formData.horaInicio} onChange={e => setFormData({ ...formData, horaInicio: e.target.value })} options={HORARIOS.slice(0, -1).map(h => ({ value: h, label: h }))} placeholder="Hora inicio" required />
            <Select label="Hora fin *" value={formData.horaFin} onChange={e => setFormData({ ...formData, horaFin: e.target.value })} options={HORARIOS.slice(1).map(h => ({ value: h, label: h }))} placeholder="Hora fin" required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Precio *" type="number" min="0" step="100" value={formData.precio} onChange={e => setFormData({ ...formData, precio: Number(e.target.value) })} error={errors.precio} required />
            <Select label="Estado *" value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value as EstadoReserva })} options={estadosOptions} placeholder="Estado" required />
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.senaPagada} onChange={e => setFormData({ ...formData, senaPagada: e.target.checked })} className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900" />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Seña pagada</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" loading={submitting}>{editingReserva ? 'Guardar cambios' : 'Crear reserva'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}