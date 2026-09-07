'use client';

import { useState, useEffect } from 'react';
import { store, type AccesoLog, type Persona, formatDate } from '@/lib/store';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';

export default function AccesosPage() {
  const [accesos, setAccesos] = useState<AccesoLog[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activeTab, setActiveTab] = useState<'checkin' | 'log'>('checkin');
  const [searchDni, setSearchDni] = useState('');
  const [foundPersona, setFoundPersona] = useState<Persona | null>(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [lastAction, setLastAction] = useState<{ type: 'entry' | 'exit'; persona: Persona } | null>(null);
  const [filterFechaDesde, setFilterFechaDesde] = useState(formatDate(new Date()));
  const [filterFechaHasta, setFilterFechaHasta] = useState(formatDate(new Date()));
  const [filterPersonaId, setFilterPersonaId] = useState('');

  useEffect(() => { refresh(); }, []);
  useEffect(() => { setPersonas(store.getPersonas().filter(p => p.estado === 'activo')); }, []);

  const refresh = () => { setAccesos(store.getAccesos({ personaId: filterPersonaId || undefined, fechaDesde: filterFechaDesde, fechaHasta: filterFechaHasta })); };

  const handleDniSearch = () => {
    const persona = personas.find(p => p.dni === searchDni.trim());
    setFoundPersona(persona || null);
    if (!persona) {
      setLastAction({ type: 'entry', persona: { id: '', nombre: 'No encontrado', apellido: '', dni: searchDni, email: '', telefono: '', rol: 'invitado', estado: 'inactivo', fechaAlta: '' } });
    }
  };

  const handleCheckin = (tipo: 'entry' | 'exit') => {
    if (!foundPersona) return;
    setCheckinLoading(true);
    setTimeout(() => {
      if (tipo === 'entry') {
        store.addAcceso({ personaId: foundPersona.id, horaEntrada: new Date().toISOString(), registradoPor: store.getUsuariosStaff()[0]?.id || 'system' });
        setLastAction({ type: 'entry', persona: foundPersona });
      } else {
        const accesosAbiertos = store.getAccesos({ personaId: foundPersona.id }).filter(a => !a.horaSalida);
        if (accesosAbiertos.length > 0) {
          store.updateAcceso(accesosAbiertos[0].id, { horaSalida: new Date().toISOString() });
          setLastAction({ type: 'exit', persona: foundPersona });
        }
      }
      refresh();
      setSearchDni('');
      setFoundPersona(null);
      setCheckinLoading(false);
    }, 500);
  };

  const columns = [
    { key: 'hora', header: 'Fecha/Hora', render: (a: AccesoLog) => new Date(a.horaEntrada).toLocaleString('es-AR') },
    { key: 'persona', header: 'Persona', render: (a: AccesoLog) => { const p = personas.find(pe => pe.id === a.personaId); return p ? `${p.nombre} ${p.apellido}` : a.personaId; } },
    { key: 'dni', header: 'DNI', render: (a: AccesoLog) => { const p = personas.find(pe => pe.id === a.personaId); return p?.dni || '—'; } },
    { key: 'entrada', header: 'Entrada', render: (a: AccesoLog) => new Date(a.horaEntrada).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) },
    { key: 'salida', header: 'Salida', render: (a: AccesoLog) => a.horaSalida ? new Date(a.horaSalida).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : <Badge variant="warning">Dentro</Badge> },
    { key: 'duracion', header: 'Duración', render: (a: AccesoLog) => {
        if (!a.horaSalida) return <span className="text-zinc-400">—</span>;
        const diff = new Date(a.horaSalida).getTime() - new Date(a.horaEntrada).getTime();
        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        return `${hrs}h ${mins}m`;
      } },
    { key: 'registrado', header: 'Registrado por', render: (a: AccesoLog) => { const u = store.getUsuariosStaff().find(u => u.id === a.registradoPor); return u?.email || a.registradoPor; } },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Accesos</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Control de entrada y salida por QR/DNI</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="checkin">Check-in / Check-out</TabsTrigger>
          <TabsTrigger value="log">Log de Accesos</TabsTrigger>
        </TabsList>

        <TabsContent value="checkin">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card padding="md">
              <CardHeader>
                <CardTitle>Escáner QR / Búsqueda por DNI</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-12 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl">
                  <svg className="w-24 h-24 mx-auto mb-4 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">Escanear código QR</p>
                  <p className="text-zinc-500 dark:text-zinc-400 mt-1">O ingresar DNI manualmente</p>
                </div>

                <div className="space-y-4">
                  <Input
                    label="DNI"
                    value={searchDni}
                    onChange={e => setSearchDni(e.target.value)}
                    placeholder="30123456"
                    onKeyDown={e => e.key === 'Enter' && handleDniSearch()}
                  />
                  <Button className="w-full" onClick={handleDniSearch} variant={searchDni ? 'primary' : 'outline'}>
                    Buscar
                  </Button>
                </div>

                {foundPersona && (
                  <Alert variant={foundPersona.estado === 'activo' ? 'success' : foundPersona.estado === 'moroso' ? 'danger' : 'warning'} title={foundPersona.estado === 'moroso' ? '⚠️ Socio Moroso' : foundPersona.estado === 'activo' ? '✓ Socio Activo' : 'Socio Inactivo'}>
                    <div className="space-y-1">
                      <p className="font-medium">{foundPersona.nombre} {foundPersona.apellido}</p>
                      <p className="text-sm">DNI: {foundPersona.dni} · {foundPersona.email}</p>
                      <p className="text-sm">Plan: {foundPersona.planMembresiaId ? store.planes.find(pl => pl.id === foundPersona.planMembresiaId)?.nombre : 'Sin plan'}</p>
                      {foundPersona.estado === 'moroso' && <p className="text-red-600 text-sm font-medium">Tiene cuotas vencidas. ¿Permitir ingreso?</p>}
                    </div>
                  </Alert>
                )}

                {foundPersona && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                    <Button
                      size="lg"
                      className="h-16"
                      onClick={() => handleCheckin('entry')}
                      disabled={checkinLoading}
                      loading={checkinLoading && lastAction?.type === 'entry'}
                    >
                      <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                      ENTRADA
                    </Button>
                    <Button
                      size="lg"
                      variant="secondary"
                      className="h-16"
                      onClick={() => handleCheckin('exit')}
                      disabled={checkinLoading}
                      loading={checkinLoading && lastAction?.type === 'exit'}
                    >
                      <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                      SALIDA
                    </Button>
                  </div>
                )}

                {lastAction && (
                  <Alert variant={lastAction.type === 'entry' ? 'success' : 'info'} className="text-center">
                    <p className="font-medium">{lastAction.type === 'entry' ? '✓ Entrada registrada' : '✓ Salida registrada'}</p>
                    <p className="text-sm">{lastAction.persona.nombre} {lastAction.persona.apellido} · {new Date().toLocaleTimeString('es-AR')}</p>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card padding="md">
              <CardHeader>
                <CardTitle>Personas dentro del predio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {store.getAccesos().filter(a => !a.horaSalida).map(acceso => {
                    const persona = personas.find(p => p.id === acceso.personaId);
                    if (!persona) return null;
                    const duracion = Date.now() - new Date(acceso.horaEntrada).getTime();
                    const hrs = Math.floor(duracion / 3600000);
                    const mins = Math.floor((duracion % 3600000) / 60000);
                    return (
                      <div key={acceso.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div>
                          <p className="font-medium text-green-800 dark:text-green-300">{persona.nombre} {persona.apellido}</p>
                          <p className="text-sm text-green-600 dark:text-green-400">Entró: {new Date(acceso.horaEntrada).toLocaleTimeString('es-AR')} · Hace {hrs}h {mins}m</p>
                        </div>
                        <Badge variant="success">DENTRO</Badge>
                      </div>
                    );
                  })}
                  {store.getAccesos().filter(a => !a.horaSalida).length === 0 && (
                    <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">Nadie dentro del predio</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="log">
          <Card padding="md">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>Historial de Accesos</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Input label="Desde" type="date" value={filterFechaDesde} onChange={e => { setFilterFechaDesde(e.target.value); refresh(); }} className="w-40" />
                <Input label="Hasta" type="date" value={filterFechaHasta} onChange={e => { setFilterFechaHasta(e.target.value); refresh(); }} className="w-40" />
                <Select value={filterPersonaId} onChange={e => { setFilterPersonaId(e.target.value); refresh(); }} options={[{ value: '', label: 'Todas las personas' }, ...personas.map(p => ({ value: p.id, label: `${p.nombre} ${p.apellido}` }))]} placeholder="Filtrar persona" className="w-56" />
              </div>
            </CardHeader>
            <CardContent>
              <Table columns={columns} data={accesos} keyExtractor={a => a.id} emptyMessage="No hay accesos en el período seleccionado" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}