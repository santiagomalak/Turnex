'use client';

import { useEffect, useState } from 'react';
import { store } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';

const statCards = [
  { key: 'totalSocios', label: 'Total Socios', icon: <UsersIcon />, color: 'bg-blue-500' },
  { key: 'morosos', label: 'Morosos', icon: <AlertIcon />, color: 'bg-red-500' },
  { key: 'cuotasPendientes', label: 'Cuotas Pendientes', icon: <ClockIcon />, color: 'bg-amber-500' },
  { key: 'cuotasVencidas', label: 'Cuotas Vencidas', icon: <XCircleIcon />, color: 'bg-red-600' },
  { key: 'reservasHoy', label: 'Reservas Hoy', icon: <CalendarIcon />, color: 'bg-green-500' },
  { key: 'espaciosActivos', label: 'Canchas Activas', icon: <CourtIcon />, color: 'bg-purple-500' },
  { key: 'ingresosMes', label: 'Ingresos del Mes', icon: <DollarIcon />, color: 'bg-emerald-500', currency: true },
  { key: 'accesosHoy', label: 'Accesos Hoy', icon: <CheckIcon />, color: 'bg-indigo-500' },
];

function UsersIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>; }
function AlertIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>; }
function ClockIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>; }
function XCircleIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>; }
function CalendarIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>; }
function CourtIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>; }
function DollarIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>; }
function CheckIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>; }

export default function DashboardPage() {
  const [stats, setStats] = useState(store.getStats());
  const [alertas, setAlertas] = useState(store.getAlertas(true));

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(store.getStats());
      setAlertas(store.getAlertas(true));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Vista general del complejo deportivo</p>
        </div>
        <Button onClick={() => { setStats(store.getStats()); setAlertas(store.getAlertas(true)); }} variant="outline" size="sm">
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        {statCards.map(card => (
          <Card key={card.key} padding="md">
            <CardContent className="flex items-start justify-between">
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{card.label}</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
                  {card.currency ? formatCurrency(stats[card.key as keyof typeof stats] as number) : stats[card.key as keyof typeof stats]}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${card.color} text-white`}>{card.icon}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" padding="md">
          <CardHeader>
            <CardTitle>Alertas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {alertas.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <p>No hay alertas pendientes</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {alertas.slice(0, 10).map(alerta => (
                  <Alert
                    key={alerta.id}
                    variant={alerta.prioridad === 'critica' || alerta.prioridad === 'alta' ? 'danger' : alerta.prioridad === 'media' ? 'warning' : 'info'}
                    title={alerta.tipo.replace(/_/g, ' ').toUpperCase()}
                    dismissible
                    onDismiss={() => { store.marcarAlertaLeida(alerta.id); setAlertas(store.getAlertas(true)); }}
                    className="text-sm"
                  >
                    {alerta.mensaje}
                  </Alert>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => { store.marcarTodasLeidas(); setAlertas(store.getAlertas(true)); }}>
                Marcar todas como leídas
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card padding="md">
          <CardHeader>
            <CardTitle>Próximos Vencimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {store.getCuotas({ estado: 'pendiente' }).slice(0, 5).map(cuota => {
                const persona = store.getPersona(cuota.personaId);
                const dias = Math.ceil((new Date(cuota.fechaVencimiento).getTime() - Date.now()) / 86400000);
                return (
                  <div key={cuota.id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">{persona?.nombre} {persona?.apellido}</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">Vence en {dias} día{dias !== 1 ? 's' : ''} · {formatCurrency(cuota.monto)}</p>
                    </div>
                    <Badge variant={dias <= 0 ? 'danger' : dias <= 3 ? 'warning' : 'info'}>{dias <= 0 ? 'Vencida' : `${dias}d`}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="md">
          <CardHeader>
            <CardTitle>Ocupación de Canchas (Hoy)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {store.getEspacios().filter(e => e.estado === 'activa').map(espacio => {
                const reservasHoy = store.getReservas({ fecha: new Date().toISOString().split('T')[0], espacioId: espacio.id });
                const confirmadas = reservasHoy.filter(r => r.estado === 'confirmada').length;
                const totalHoras = 14;
                const ocupacion = Math.round((confirmadas / totalHoras) * 100);
                return (
                  <div key={espacio.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{espacio.nombre}</span>
                      <span className="text-zinc-500 dark:text-zinc-400">{confirmadas}/{totalHoras} hrs ({ocupacion}%)</span>
                    </div>
                    <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div className="h-full bg-zinc-900 dark:bg-white rounded-full transition-all" style={{ width: `${ocupacion}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card padding="md">
          <CardHeader>
            <CardTitle>Últimos Pagos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {store.getMovimientos().slice(0, 5).map(mov => {
                const persona = store.getPersona(mov.personaId);
                const tipoLabels = { cuota: 'Cuota', alquiler: 'Alquiler', venta: 'Venta' };
                const medioLabels = { efectivo: 'Efectivo', transferencia: 'Transferencia', mercadopago: 'MercadoPago', modo: 'MODO', debito_automatico: 'Débito Auto' };
                return (
                  <div key={mov.id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">{persona?.nombre} {persona?.apellido}</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">{tipoLabels[mov.tipo]} · {medioLabels[mov.medioPago]}</p>
                    </div>
                    <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(mov.monto)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}