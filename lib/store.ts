'use client';

export type {
  Persona,
  PlanMembresia,
  Espacio,
  Reserva,
  Cuota,
  Movimiento,
  AccesoLog,
  UsuarioStaff,
  Alerta,
  RolPersona,
  EstadoPersona,
  TipoEspacio,
  EstadoEspacio,
  EstadoReserva,
  EstadoCuota,
  TipoMovimiento,
  MedioPago,
  RolStaff,
} from './types';

import type {
  Persona,
  PlanMembresia,
  Espacio,
  Reserva,
  Cuota,
  Movimiento,
  AccesoLog,
  UsuarioStaff,
  Alerta,
  RolPersona,
  EstadoPersona,
  TipoEspacio,
  EstadoEspacio,
  EstadoReserva,
  EstadoCuota,
  TipoMovimiento,
  MedioPago,
  RolStaff,
} from './types';

function uid() {
  return crypto.randomUUID();
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDateTime(date: Date): string {
  return date.toISOString();
}

const today = new Date();
const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

export const store = {
  planes: [
    { id: uid(), nombre: 'Social', precioMensual: 15000, incluyeCanchas: false, descuentoPorcentaje: 0 },
    { id: uid(), nombre: 'Deportivo', precioMensual: 25000, incluyeCanchas: true, descuentoPorcentaje: 10 },
    { id: uid(), nombre: 'Full', precioMensual: 35000, incluyeCanchas: true, descuentoPorcentaje: 20 },
  ] as PlanMembresia[],

  personas: [
    { id: uid(), nombre: 'Juan', apellido: 'Pérez', dni: '30123456', email: 'juan.perez@email.com', telefono: '11-4444-1111', rol: 'socio', estado: 'activo', fechaAlta: '2023-03-15', planMembresiaId: '' },
    { id: uid(), nombre: 'María', apellido: 'González', dni: '27890123', email: 'maria.gonzalez@email.com', telefono: '11-4444-2222', rol: 'socio', estado: 'activo', fechaAlta: '2022-11-20', planMembresiaId: '' },
    { id: uid(), nombre: 'Carlos', apellido: 'Rodríguez', dni: '32456789', email: 'carlos.rodriguez@email.com', telefono: '11-4444-3333', rol: 'socio', estado: 'moroso', fechaAlta: '2024-01-10', planMembresiaId: '' },
    { id: uid(), nombre: 'Ana', apellido: 'Martínez', dni: '29567890', email: 'ana.martinez@email.com', telefono: '11-4444-4444', rol: 'socio', estado: 'activo', fechaAlta: '2023-07-05', planMembresiaId: '' },
    { id: uid(), nombre: 'Luis', apellido: 'Fernández', dni: '31234567', email: 'luis.fernandez@email.com', telefono: '11-4444-5555', rol: 'invitado', estado: 'activo', fechaAlta: '2024-08-01', planMembresiaId: undefined },
    { id: uid(), nombre: 'Sofía', apellido: 'López', dni: '28901234', email: 'sofia.lopez@email.com', telefono: '11-4444-6666', rol: 'invitado', estado: 'activo', fechaAlta: '2024-08-15', planMembresiaId: undefined },
    { id: uid(), nombre: 'Pedro', apellido: 'García', dni: '25678901', email: 'pedro.garcia@email.com', telefono: '11-4444-7777', rol: 'profesor', estado: 'activo', fechaAlta: '2022-05-01', planMembresiaId: undefined },
    { id: uid(), nombre: 'Laura', apellido: 'Sánchez', dni: '26789012', email: 'laura.sanchez@email.com', telefono: '11-4444-8888', rol: 'profesor', estado: 'activo', fechaAlta: '2023-02-15', planMembresiaId: undefined },
    { id: uid(), nombre: 'Roberto', apellido: 'Torres', dni: '24567890', email: 'roberto.torres@email.com', telefono: '11-4444-9999', rol: 'staff', estado: 'activo', fechaAlta: '2021-10-01', planMembresiaId: undefined },
    { id: uid(), nombre: 'Lucía', apellido: 'Ramírez', dni: '33456789', email: 'lucia.ramirez@email.com', telefono: '11-4444-0000', rol: 'staff', estado: 'activo', fechaAlta: '2023-09-01', planMembresiaId: undefined },
  ] as Persona[],

  espacios: [
    { id: uid(), nombre: 'Cancha Fútbol 1', tipo: 'futbol', precioPorHora: 12000, estado: 'activa' },
    { id: uid(), nombre: 'Cancha Fútbol 2', tipo: 'futbol', precioPorHora: 12000, estado: 'activa' },
    { id: uid(), nombre: 'Cancha Fútbol 3', tipo: 'futbol', precioPorHora: 10000, estado: 'mantenimiento' },
    { id: uid(), nombre: 'Cancha Pádel 1', tipo: 'padel', precioPorHora: 8000, estado: 'activa' },
    { id: uid(), nombre: 'Cancha Pádel 2', tipo: 'padel', precioPorHora: 8000, estado: 'activa' },
    { id: uid(), nombre: 'Cancha Pádel 3', tipo: 'padel', precioPorHora: 7000, estado: 'activa' },
    { id: uid(), nombre: 'Cancha Tenis 1', tipo: 'tenis', precioPorHora: 9000, estado: 'activa' },
    { id: uid(), nombre: 'Cancha Vóley 1', tipo: 'voley', precioPorHora: 6000, estado: 'activa' },
  ] as Espacio[],

  reservas: [] as Reserva[],

  cuotas: [] as Cuota[],

  movimientos: [] as Movimiento[],

  accesos: [] as AccesoLog[],

  usuariosStaff: [
    { id: uid(), personaId: '', email: 'admin@turnex.com', rol: 'admin', activo: true },
    { id: uid(), personaId: '', email: 'recepcion@turnex.com', rol: 'recepcion', activo: true },
    { id: uid(), personaId: '', email: 'cobranzas@turnex.com', rol: 'cobranzas', activo: true },
  ] as UsuarioStaff[],

  alertas: [] as Alerta[],

  init() {
    this.asignarPlanes();
    this.generarCuotasMesActual();
    this.generarReservasEjemplo();
    this.generarMovimientosEjemplo();
    this.generarAccesosEjemplo();
    this.generarAlertas();
    this.vincularStaff();
  },

  asignarPlanes() {
    const [planSocial, planDeportivo, planFull] = this.planes;
    this.personas.forEach((p, i) => {
      if (p.rol === 'socio') {
        if (i % 3 === 0) p.planMembresiaId = planSocial.id;
        else if (i % 3 === 1) p.planMembresiaId = planDeportivo.id;
        else p.planMembresiaId = planFull.id;
      }
    });
  },

  generarCuotasMesActual() {
    this.personas.filter(p => p.rol === 'socio' && p.planMembresiaId).forEach(p => {
      const plan = this.planes.find(pl => pl.id === p.planMembresiaId);
      if (!plan) return;
      const estado: EstadoCuota = p.estado === 'moroso' ? 'vencida' : Math.random() > 0.3 ? 'pagada' : 'pendiente';
      this.cuotas.push({
        id: uid(),
        personaId: p.id,
        periodo: formatDate(startOfMonth),
        monto: plan.precioMensual,
        estado,
        fechaVencimiento: formatDate(addDays(startOfMonth, 10)),
      });
    });
  },

  generarReservasEjemplo() {
    const socios = this.personas.filter(p => p.rol === 'socio' || p.rol === 'invitado');
    const espaciosActivos = this.espacios.filter(e => e.estado === 'activa');
    const horarios = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

    for (let day = 0; day < 14; day++) {
      const fecha = formatDate(addDays(today, day));
      espaciosActivos.forEach(espacio => {
        const numReservas = Math.floor(Math.random() * 4);
        const horariosUsados = new Set<string>();
        for (let r = 0; r < numReservas; r++) {
          const horaIdx = Math.floor(Math.random() * horarios.length);
          const horaInicio = horarios[horaIdx];
          if (horariosUsados.has(horaInicio)) continue;
          horariosUsados.add(horaInicio);
          const horaFin = horarios[horaIdx + 1] || '22:00';
          const socio = socios[Math.floor(Math.random() * socios.length)];
          const estado: EstadoReserva = Math.random() > 0.2 ? 'confirmada' : 'pendiente_pago';
          this.reservas.push({
            id: uid(),
            espacioId: espacio.id,
            personaId: socio.id,
            fecha,
            horaInicio,
            horaFin,
            estado,
            precio: espacio.precioPorHora,
            senaPagada: estado === 'confirmada',
            creadoEn: formatDateTime(addDays(today, -Math.floor(Math.random() * 10))),
          });
        }
      });
    }
  },

  generarMovimientosEjemplo() {
    this.cuotas.forEach(cuota => {
      if (cuota.estado === 'pagada') {
        this.movimientos.push({
          id: uid(),
          personaId: cuota.personaId,
          cuotaId: cuota.id,
          tipo: 'cuota',
          monto: cuota.monto,
          medioPago: ['efectivo', 'transferencia', 'mercadopago'][Math.floor(Math.random() * 3)] as MedioPago,
          registradoPor: this.usuariosStaff[0].id,
          fecha: formatDateTime(addDays(new Date(cuota.fechaVencimiento), -Math.floor(Math.random() * 5))),
        });
      }
    });

    this.reservas.filter(r => r.estado === 'confirmada').forEach(reserva => {
      if (Math.random() > 0.3) {
        this.movimientos.push({
          id: uid(),
          personaId: reserva.personaId,
          reservaId: reserva.id,
          tipo: 'alquiler',
          monto: reserva.precio,
          medioPago: ['efectivo', 'transferencia', 'mercadopago'][Math.floor(Math.random() * 3)] as MedioPago,
          registradoPor: this.usuariosStaff[1].id,
          fecha: formatDateTime(new Date(`${reserva.fecha}T${reserva.horaInicio}`)),
        });
      }
    });
  },

  generarAccesosEjemplo() {
    const sociosActivos = this.personas.filter(p => p.estado === 'activo');
    for (let day = 0; day < 7; day++) {
      const fechaBase = addDays(today, -day);
      const numAccesos = Math.floor(Math.random() * 20) + 10;
      for (let i = 0; i < numAccesos; i++) {
        const persona = sociosActivos[Math.floor(Math.random() * sociosActivos.length)];
        const horaEntrada = new Date(fechaBase);
        horaEntrada.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));
        const horaSalida = Math.random() > 0.3 ? new Date(horaEntrada.getTime() + (60 + Math.random() * 120) * 60000) : undefined;
        this.accesos.push({
          id: uid(),
          personaId: persona.id,
          horaEntrada: formatDateTime(horaEntrada),
          horaSalida: horaSalida ? formatDateTime(horaSalida) : undefined,
          registradoPor: this.usuariosStaff[1].id,
        });
      }
    }
    this.accesos.sort((a, b) => new Date(b.horaEntrada).getTime() - new Date(a.horaEntrada).getTime());
  },

  generarAlertas() {
    this.cuotas.filter(c => c.estado === 'vencida' || (c.estado === 'pendiente' && new Date(c.fechaVencimiento) < addDays(today, 3))).forEach(cuota => {
      const persona = this.personas.find(p => p.id === cuota.personaId);
      if (!persona) return;
      this.alertas.push({
        id: uid(),
        tipo: cuota.estado === 'vencida' ? 'moroso' : 'vencimiento_cuota',
        mensaje: cuota.estado === 'vencida'
          ? `${persona.nombre} ${persona.apellido} tiene cuota vencida ($${cuota.monto})`
          : `${persona.nombre} ${persona.apellido} vence cuota el ${cuota.fechaVencimiento} ($${cuota.monto})`,
        personaId: persona.id,
        fecha: formatDateTime(today),
        leida: false,
        prioridad: cuota.estado === 'vencida' ? 'alta' : 'media',
      });
    });

    this.espacios.filter(e => e.estado === 'mantenimiento').forEach(e => {
      this.alertas.push({
        id: uid(),
        tipo: 'espacio_mantenimiento',
        mensaje: `La ${e.nombre} está en mantenimiento`,
        espacioId: e.id,
        fecha: formatDateTime(today),
        leida: false,
        prioridad: 'media',
      });
    });

    const reservasProximas = this.reservas.filter(r => {
      const reservaDate = new Date(`${r.fecha}T${r.horaInicio}`);
      return r.estado === 'confirmada' && reservaDate > today && reservaDate < addDays(today, 1);
    });
    reservasProximas.slice(0, 5).forEach(r => {
      const persona = this.personas.find(p => p.id === r.personaId);
      const espacio = this.espacios.find(e => e.id === r.espacioId);
      if (!persona || !espacio) return;
      this.alertas.push({
        id: uid(),
        tipo: 'reserva_proxima',
        mensaje: `Reserva de ${persona.nombre} ${persona.apellido} en ${espacio.nombre} a las ${r.horaInicio}`,
        personaId: persona.id,
        espacioId: espacio.id,
        reservaId: r.id,
        fecha: formatDateTime(today),
        leida: false,
        prioridad: 'baja',
      });
    });
  },

  vincularStaff() {
    const staffPersonas = this.personas.filter(p => p.rol === 'staff');
    this.usuariosStaff.forEach((u, i) => {
      if (staffPersonas[i]) u.personaId = staffPersonas[i].id;
    });
  },

  // CRUD helpers
  getPersonas() { return [...this.personas].sort((a, b) => a.apellido.localeCompare(b.apellido)); },
  getPersona(id: string) { return this.personas.find(p => p.id === id); },
  addPersona(p: Omit<Persona, 'id'>) { const n = { ...p, id: uid() }; this.personas.push(n); return n; },
  updatePersona(id: string, data: Partial<Persona>) { const i = this.personas.findIndex(p => p.id === id); if (i >= 0) { this.personas[i] = { ...this.personas[i], ...data }; return this.personas[i]; } return null; },
  deletePersona(id: string) { const i = this.personas.findIndex(p => p.id === id); if (i >= 0) return this.personas.splice(i, 1)[0]; return null; },

  getEspacios() { return [...this.espacios].sort((a, b) => a.nombre.localeCompare(b.nombre)); },
  getEspacio(id: string) { return this.espacios.find(e => e.id === id); },
  addEspacio(e: Omit<Espacio, 'id'>) { const n = { ...e, id: uid() }; this.espacios.push(n); return n; },
  updateEspacio(id: string, data: Partial<Espacio>) { const i = this.espacios.findIndex(e => e.id === id); if (i >= 0) { this.espacios[i] = { ...this.espacios[i], ...data }; return this.espacios[i]; } return null; },
  deleteEspacio(id: string) { const i = this.espacios.findIndex(e => e.id === id); if (i >= 0) return this.espacios.splice(i, 1)[0]; return null; },

  getReservas(filtro?: { fecha?: string; espacioId?: string; personaId?: string }) {
    let res = [...this.reservas];
    if (filtro?.fecha) res = res.filter(r => r.fecha === filtro.fecha);
    if (filtro?.espacioId) res = res.filter(r => r.espacioId === filtro.espacioId);
    if (filtro?.personaId) res = res.filter(r => r.personaId === filtro.personaId);
    return res.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio));
  },
  getReserva(id: string) { return this.reservas.find(r => r.id === id); },
  addReserva(r: Omit<Reserva, 'id' | 'creadoEn'>) { 
    const conflict = this.reservas.some(ex => 
      ex.espacioId === r.espacioId && ex.fecha === r.fecha && ex.estado !== 'cancelada' &&
      !(r.horaFin <= ex.horaInicio || r.horaInicio >= ex.horaFin)
    );
    if (conflict) throw new Error('Conflicto de horario: el espacio ya está reservado en ese rango');
    const n = { ...r, id: uid(), creadoEn: formatDateTime(new Date()) };
    this.reservas.push(n);
    return n;
  },
  updateReserva(id: string, data: Partial<Reserva>) { const i = this.reservas.findIndex(r => r.id === id); if (i >= 0) { this.reservas[i] = { ...this.reservas[i], ...data }; return this.reservas[i]; } return null; },
  deleteReserva(id: string) { const i = this.reservas.findIndex(r => r.id === id); if (i >= 0) return this.reservas.splice(i, 1)[0]; return null; },

  getCuotas(filtro?: { personaId?: string; estado?: EstadoCuota }) {
    let res = [...this.cuotas];
    if (filtro?.personaId) res = res.filter(c => c.personaId === filtro.personaId);
    if (filtro?.estado) res = res.filter(c => c.estado === filtro.estado);
    return res.sort((a, b) => b.periodo.localeCompare(a.periodo));
  },
  getCuota(id: string) { return this.cuotas.find(c => c.id === id); },
  updateCuota(id: string, data: Partial<Cuota>) { const i = this.cuotas.findIndex(c => c.id === id); if (i >= 0) { this.cuotas[i] = { ...this.cuotas[i], ...data }; return this.cuotas[i]; } return null; },

  getMovimientos(filtro?: { personaId?: string; tipo?: TipoMovimiento }) {
    let res = [...this.movimientos];
    if (filtro?.personaId) res = res.filter(m => m.personaId === filtro.personaId);
    if (filtro?.tipo) res = res.filter(m => m.tipo === filtro.tipo);
    return res.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  },
  addMovimiento(m: Omit<Movimiento, 'id'>) { const n = { ...m, id: uid() }; this.movimientos.push(n); return n; },

  getAccesos(filtro?: { personaId?: string; fechaDesde?: string; fechaHasta?: string }) {
    let res = [...this.accesos];
    if (filtro?.personaId) res = res.filter(a => a.personaId === filtro.personaId);
    if (filtro?.fechaDesde) res = res.filter(a => a.horaEntrada >= filtro.fechaDesde!);
    if (filtro?.fechaHasta) res = res.filter(a => a.horaEntrada <= filtro.fechaHasta!);
    return res.sort((a, b) => new Date(b.horaEntrada).getTime() - new Date(a.horaEntrada).getTime());
  },
  addAcceso(a: Omit<AccesoLog, 'id'>) { const n = { ...a, id: uid() }; this.accesos.push(n); return n; },
  updateAcceso(id: string, data: Partial<AccesoLog>) { const i = this.accesos.findIndex(a => a.id === id); if (i >= 0) { this.accesos[i] = { ...this.accesos[i], ...data }; return this.accesos[i]; } return null; },

  getAlertas(noLeidas = false) {
    let res = [...this.alertas].sort((a, b) => {
      const prio = { critica: 4, alta: 3, media: 2, baja: 1 };
      return prio[b.prioridad] - prio[a.prioridad] || new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    });
    if (noLeidas) res = res.filter(a => !a.leida);
    return res;
  },
  marcarAlertaLeida(id: string) { const a = this.alertas.find(x => x.id === id); if (a) a.leida = true; },
  marcarTodasLeidas() { this.alertas.forEach(a => a.leida = true); },

  getUsuariosStaff() { return [...this.usuariosStaff]; },
  getStaffByEmail(email: string) { return this.usuariosStaff.find(u => u.email === email); },

  // Stats para dashboard
  getStats() {
    const socios = this.personas.filter(p => p.rol === 'socio');
    const morosos = socios.filter(p => p.estado === 'moroso').length;
    const cuotasPendientes = this.cuotas.filter(c => c.estado === 'pendiente').length;
    const cuotasVencidas = this.cuotas.filter(c => c.estado === 'vencida').length;
    const reservasHoy = this.reservas.filter(r => r.fecha === formatDate(today) && r.estado === 'confirmada').length;
    const espaciosActivos = this.espacios.filter(e => e.estado === 'activa').length;
    const ingresosMes = this.movimientos
      .filter(m => new Date(m.fecha) >= startOfMonth && new Date(m.fecha) <= endOfMonth)
      .reduce((sum, m) => sum + m.monto, 0);
    const accesosHoy = this.accesos.filter(a => a.horaEntrada.startsWith(formatDate(today))).length;

    return {
      totalSocios: socios.length,
      morosos,
      cuotasPendientes,
      cuotasVencidas,
      reservasHoy,
      espaciosActivos,
      ingresosMes,
      accesosHoy,
      alertasNoLeidas: this.alertas.filter(a => !a.leida).length,
    };
  },
};

if (typeof window !== 'undefined') {
  (window as any).__store = store;
}

store.init();

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value);
}

export { formatDate, addDays };