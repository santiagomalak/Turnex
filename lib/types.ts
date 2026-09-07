export type RolPersona = 'socio' | 'invitado' | 'staff' | 'profesor';
export type EstadoPersona = 'activo' | 'inactivo' | 'moroso';
export type TipoEspacio = 'futbol' | 'padel' | 'tenis' | 'voley' | 'otro';
export type EstadoEspacio = 'activa' | 'mantenimiento';
export type EstadoReserva = 'confirmada' | 'cancelada' | 'pendiente_pago';
export type EstadoCuota = 'pendiente' | 'pagada' | 'vencida';
export type TipoMovimiento = 'cuota' | 'alquiler' | 'venta';
export type MedioPago = 'efectivo' | 'transferencia' | 'mercadopago' | 'modo' | 'debito_automatico';
export type RolStaff = 'admin' | 'recepcion' | 'cobranzas' | 'profesor';

export interface Persona {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string;
  rol: RolPersona;
  estado: EstadoPersona;
  fechaAlta: string;
  planMembresiaId?: string;
  avatar?: string;
}

export interface PlanMembresia {
  id: string;
  nombre: string;
  precioMensual: number;
  incluyeCanchas: boolean;
  descuentoPorcentaje: number;
}

export interface Espacio {
  id: string;
  nombre: string;
  tipo: TipoEspacio;
  precioPorHora: number;
  estado: EstadoEspacio;
}

export interface Reserva {
  id: string;
  espacioId: string;
  personaId: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: EstadoReserva;
  precio: number;
  senaPagada: boolean;
  creadoEn: string;
}

export interface Cuota {
  id: string;
  personaId: string;
  periodo: string;
  monto: number;
  estado: EstadoCuota;
  fechaVencimiento: string;
}

export interface Movimiento {
  id: string;
  personaId: string;
  cuotaId?: string;
  reservaId?: string;
  tipo: TipoMovimiento;
  monto: number;
  medioPago: MedioPago;
  comprobanteUrl?: string;
  registradoPor: string;
  fecha: string;
}

export interface AccesoLog {
  id: string;
  personaId: string;
  horaEntrada: string;
  horaSalida?: string;
  registradoPor: string;
}

export interface UsuarioStaff {
  id: string;
  personaId?: string;
  email: string;
  rol: RolStaff;
  activo: boolean;
}

export interface Alerta {
  id: string;
  tipo: 'vencimiento_cuota' | 'moroso' | 'reserva_proxima' | 'espacio_mantenimiento' | 'cupo_lleno';
  mensaje: string;
  personaId?: string;
  espacioId?: string;
  reservaId?: string;
  fecha: string;
  leida: boolean;
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
}

export type { QueryResultRow } from 'pg';