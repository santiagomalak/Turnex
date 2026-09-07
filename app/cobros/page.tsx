'use client';

import { useState, useEffect, FormEvent } from 'react';
import { store, type Movimiento, type Cuota, type Persona, type MedioPago, type TipoMovimiento } from '@/lib/store';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { formatDate, formatCurrency } from '@/lib/store';

const mediosOptions = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'mercadopago', label: 'MercadoPago' },
  { value: 'modo', label: 'MODO' },
  { value: 'debito_automatico', label: 'Débito automático' },
];

const tiposOptions = [
  { value: 'cuota', label: 'Cuota mensual' },
  { value: 'alquiler', label: 'Alquiler cancha' },
  { value: 'venta', label: 'Venta (kiosco/otros)' },
];

const initialForm = {
  personaId: '',
  tipo: 'cuota' as TipoMovimiento,
  monto: 0,
  medioPago: 'efectivo' as MedioPago,
  cuotaId: '',
  reservaId: '',
  comprobanteUrl: '',
};

export default function CobrosPage() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cuotas, setCuotas] = useState<Cuota[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activeTab, setActiveTab] = useState<'registrar' | 'historial' | 'cuotas'>('registrar');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMovimiento, setEditingMovimiento] = useState<Movimiento | null>(null);
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState<Partial<typeof initialForm>>({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [filterPersonaId, setFilterPersonaId] = useState('');
  const [filterTipo, setFilterTipo] = useState<TipoMovimiento | ''>('');

  useEffect(() => { refresh(); }, []);
  useEffect(() => { setPersonas(store.getPersonas().filter(p => p.rol === 'socio' || p.rol === 'invitado')); }, []);

  const refresh = () => {
    setMovimientos(store.getMovimientos({ personaId: filterPersonaId || undefined, tipo: filterTipo || undefined }));
    setCuotas(store.getCuotas({ estado: 'pendiente' }));
  };

  const validate = (data: typeof formData) => {
    const newErrors: Partial<typeof formData> = {};
    if (!data.personaId) newErrors.personaId = 'Seleccionar persona';
    if (data.monto <= 0) newErrors.monto = 'Monto debe ser mayor a 0';
    if (data.tipo === 'cuota' && !data.cuotaId) newErrors.cuotaId = 'Seleccionar cuota a pagar';
    if (data.tipo === 'alquiler' && !data.reservaId) newErrors.reservaId = 'Seleccionar reserva';
    return newErrors;
  };

  const handlePersonaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const personaId = e.target.value;
    setFormData({ ...formData, personaId, cuotaId: '', reservaId: '' });
    if (personaId) {
      const p = personas.find(pe => pe.id === personaId);
      setSelectedPersona(p || null);
      const cuotasPendientes = store.getCuotas({ personaId, estado: 'pendiente' });
      const reservasPendientes = store.getReservas({ personaId }).filter(r => r.estado === 'pendiente_pago');
    }
  };

  const handleTipoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, tipo: e.target.value as TipoMovimiento, cuotaId: '', reservaId: '' });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const newErrors = validate(formData);
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setSubmitting(true);
    try {
      const movimientoData = {
        ...formData,
        registradoPor: store.getUsuariosStaff()[0]?.id || 'system',
        fecha: new Date().toISOString(),
      };
      store.addMovimiento(movimientoData);
      if (formData.tipo === 'cuota' && formData.cuotaId) {
        store.updateCuota(formData.cuotaId, { estado: 'pagada' });
      }
      if (formData.tipo === 'alquiler' && formData.reservaId) {
        store.updateReserva(formData.reservaId, { senaPagada: true, estado: 'confirmada' });
      }
      refresh(); closeModal();
    } finally { setSubmitting(false); }
  };

  const openModal = (movimiento?: Movimiento) => {
    if (movimiento) { setEditingMovimiento(movimiento); setFormData({ ...movimiento }); }
    else { setEditingMovimiento(null); setFormData(initialForm); setSelectedPersona(null); }
    setErrors({}); setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingMovimiento(null); setFormData(initialForm); setErrors({}); setSelectedPersona(null); };

  const getTipoBadge = (tipo: TipoMovimiento) => {
    const variants: Record<TipoMovimiento, 'info' | 'success' | 'warning'> = { cuota: 'info', alquiler: 'success', venta: 'warning' };
    return <Badge variant={variants[tipo]}>{tipo}</Badge>;
  };

  const getMedioBadge = (medio: MedioPago) => <Badge variant="neutral">{medio}</Badge>;

  const columnsHistorial = [
    { key: 'fecha', header: 'Fecha', render: (m: Movimiento) => m.fecha.split('T')[0] },
    { key: 'persona', header: 'Persona', render: (m: Movimiento) => { const p = store.getPersona(m.personaId); return p ? `${p.nombre} ${p.apellido}` : m.personaId; } },
    { key: 'tipo', header: 'Tipo', render: (m: Movimiento) => getTipoBadge(m.tipo) },
    { key: 'monto', header: 'Monto', render: (m: Movimiento) => formatCurrency(m.monto) },
    { key: 'medio', header: 'Medio', render: (m: Movimiento) => getMedioBadge(m.medioPago) },
    { key: 'comprobante', header: 'Comprobante', render: (m: Movimiento) => m.comprobanteUrl ? <a href={m.comprobanteUrl} target="_blank" className="text-blue-600 underline">Ver</a> : <span className="text-zinc-400">—</span> },
  ];

  const columnsCuotas = [
    { key: 'persona', header: 'Socio', render: (c: Cuota) => { const p = store.getPersona(c.personaId); return p ? `${p.nombre} ${p.apellido}` : c.personaId; } },
    { key: 'periodo', header: 'Período', render: (c: Cuota) => c.periodo.slice(0, 7) },
    { key: 'monto', header: 'Monto', render: (c: Cuota) => formatCurrency(c.monto) },
    { key: 'estado', header: 'Estado', render: (c: Cuota) => <Badge variant={c.estado === 'pagada' ? 'success' : c.estado === 'vencida' ? 'danger' : 'warning'}>{c.estado}</Badge> },
    { key: 'vencimiento', header: 'Vence', render: (c: Cuota) => c.fechaVencimiento },
    { key: 'actions', header: 'Acciones', render: (c: Cuota) => (
        <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); setFormData({ ...initialForm, personaId: c.personaId, tipo: 'cuota', monto: c.monto, cuotaId: c.id }); setSelectedPersona(store.getPersona(c.personaId) || null); openModal(); }}>Cobrar</Button>
      ) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Cobros</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Registro de pagos y estado de cuotas</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="registrar">Registrar Cobro</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
          <TabsTrigger value="cuotas">Cuotas Pendientes</TabsTrigger>
        </TabsList>

        <TabsContent value="registrar">
          <Card padding="md">
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select label="Persona *" value={formData.personaId} onChange={handlePersonaChange} options={personas.map(p => ({ value: p.id, label: `${p.nombre} ${p.apellido} (${p.rol})` }))} placeholder="Buscar socio/invitado" required />
                <Select label="Tipo de cobro *" value={formData.tipo} onChange={handleTipoChange} options={tiposOptions} placeholder="Seleccionar tipo" required />
                <Select label="Medio de pago *" value={formData.medioPago} onChange={e => setFormData({ ...formData, medioPago: e.target.value as MedioPago })} options={mediosOptions} placeholder="Seleccionar medio" required />
              </div>

              <Input label="Monto *" type="number" min="0" step="100" value={formData.monto} onChange={e => setFormData({ ...formData, monto: Number(e.target.value) })} error={errors.monto} required />

              {formData.tipo === 'cuota' && selectedPersona && (
                <Select label="Cuota a pagar" value={formData.cuotaId} onChange={e => setFormData({ ...formData, cuotaId: e.target.value, monto: cuotas.find(c => c.id === e.target.value)?.monto || 0 })} options={cuotas.filter(c => c.personaId === selectedPersona.id).map(c => ({ value: c.id, label: `${c.periodo.slice(0,7)} - ${formatCurrency(c.monto)} (${c.estado})` }))} placeholder="Seleccionar cuota pendiente" required />
              )}

              {formData.tipo === 'alquiler' && selectedPersona && (
                <Select label="Reserva a pagar" value={formData.reservaId} onChange={e => setFormData({ ...formData, reservaId: e.target.value, monto: store.getReserva(e.target.value)?.precio || 0 })} options={store.getReservas({ personaId: selectedPersona.id }).filter(r => r.estado === 'pendiente_pago').map(r => ({ value: r.id, label: `${store.getEspacio(r.espacioId)?.nombre} ${r.fecha} ${r.horaInicio}-${r.horaFin} - ${formatCurrency(r.precio)}` }))} placeholder="Seleccionar reserva pendiente" required />
              )}

              <Input label="Comprobante (URL opcional)" value={formData.comprobanteUrl} onChange={e => setFormData({ ...formData, comprobanteUrl: e.target.value })} placeholder="https://..." />

              {selectedPersona && (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                  <p className="font-medium">{selectedPersona.nombre} {selectedPersona.apellido}</p>
                  <p className="text-sm text-zinc-500">DNI: {selectedPersona.dni} · {selectedPersona.email}</p>
                  <div className="mt-2 flex gap-2">
                    <Badge variant={selectedPersona.estado === 'activo' ? 'success' : selectedPersona.estado === 'moroso' ? 'danger' : 'neutral'}>{selectedPersona.estado}</Badge>
                    {selectedPersona.planMembresiaId && <Badge variant="info">{store.planes.find(pl => pl.id === selectedPersona.planMembresiaId)?.nombre}</Badge>}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button>
                <Button onClick={() => handleSubmit(new Event('submit'))} loading={submitting}>Registrar cobro</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historial">
          <Card padding="md">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>Historial de Movimientos</CardTitle>
              <div className="flex gap-2">
                <Select value={filterPersonaId} onChange={e => { setFilterPersonaId(e.target.value); refresh(); }} options={[{ value: '', label: 'Todas las personas' }, ...personas.map(p => ({ value: p.id, label: `${p.nombre} ${p.apellido}` }))]} placeholder="Filtrar persona" className="w-56" />
                <Select value={filterTipo} onChange={e => { setFilterTipo(e.target.value as any); refresh(); }} options={[{ value: '', label: 'Todos los tipos' }, ...tiposOptions]} placeholder="Filtrar tipo" className="w-48" />
              </div>
            </CardHeader>
            <CardContent>
              <Table columns={columnsHistorial} data={movimientos} keyExtractor={m => m.id} emptyMessage="No hay movimientos registrados" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cuotas">
          <Card padding="md">
            <CardHeader>
              <CardTitle>Cuotas Pendientes de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <Table columns={columnsCuotas} data={cuotas} keyExtractor={c => c.id} emptyMessage="No hay cuotas pendientes" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}