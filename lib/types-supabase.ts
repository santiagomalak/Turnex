export type Persona = {
  id: string
  nombre: string
  apellido: string
  dni: string | null
  email: string | null
  telefono: string | null
  rol: 'socio' | 'invitado' | 'staff' | 'profesor'
  estado: 'activo' | 'inactivo' | 'moroso' | 'pendiente_aprobacion'
  fecha_alta: string
  plan_membresia_id: string | null
}

export type PlanMembresia = {
  id: string
  nombre: string
  precio_mensual: number
  incluye_canchas: boolean
  descuento_porcentaje: number
  activo: boolean
}

export type Espacio = {
  id: string
  nombre: string
  tipo: 'futbol' | 'padel' | 'tenis' | 'voley' | 'beach_voley' | 'otro'
  precio_por_hora: number
  estado: 'activa' | 'mantenimiento'
  sector: string | null
}

export type EstadoReserva =
  | 'confirmada'
  | 'pendiente_pago'
  | 'cancelada'
  | 'cumplida'
  | 'ausente'

export type Reserva = {
  id: string
  espacio_id: string
  persona_id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  estado: EstadoReserva
  precio: number
  sena_pagada: boolean
  creado_en: string
  origen: 'recepcion' | 'portal' | 'abono'
  abono_id: string | null
  creada_por: string | null
  movimiento_id: string | null
  notas: string | null
}

export type Abono = {
  id: string
  persona_id: string
  espacio_id: string
  dia_semana: number
  hora_inicio: string
  hora_fin: string
  precio_mensual: number
  vigente_desde: string
  vigente_hasta: string | null
  estado: 'activo' | 'pausado' | 'cancelado'
  creado_por: string | null
  creado_en: string
}

export type EstadoCuota = 'pendiente' | 'parcial' | 'pagada' | 'vencida'

export type Cuota = {
  id: string
  persona_id: string
  periodo: string | null
  monto: number
  estado: EstadoCuota
  fecha_vencimiento: string
  plan_pago_id: string | null
  concepto: string | null
  movimiento_id: string | null
}

export type ClaseMovimiento = 'cargo' | 'pago'
export type DireccionMov = 'ingreso' | 'egreso'
export type TipoMov = 'cuota' | 'alquiler' | 'venta' | 'pago_staff' | 'ajuste' | 'pago'
export type MedioPago =
  | 'efectivo'
  | 'transferencia'
  | 'mercadopago'
  | 'modo'
  | 'debito_automatico'
  | 'fiado'
export type EstadoMov = 'pendiente' | 'parcial' | 'saldado' | 'pagado'

export type Movimiento = {
  id: string
  persona_id: string
  cuota_id: string | null
  reserva_id: string | null
  clase: ClaseMovimiento
  tipo: TipoMov
  monto: number
  saldo: number
  medio_pago: MedioPago | null
  comprobante_url: string | null
  registrado_por: string | null
  fecha: string
  vence_el: string | null
  estado: EstadoMov
  direccion: DireccionMov
  concepto: string | null
  anulado: boolean
}

export type Imputacion = {
  id: string
  pago_id: string
  cargo_id: string
  monto: number
  creado_en: string
}

export type PlanPago = {
  id: string
  persona_id: string
  descripcion: string
  total: number
  cant_cuotas: number
  estado: 'vigente' | 'completado' | 'cancelado'
  creado_por: string | null
  creado_en: string
}

export type AccesoLog = {
  id: string
  persona_id: string
  hora_entrada: string
  hora_salida: string | null
  registrado_por: string | null
}

export type UsuarioStaff = {
  id: string
  persona_id: string | null
  email: string
  rol: 'admin' | 'recepcion' | 'cobranzas' | 'profesor'
  activo: boolean
}

export type Alerta = {
  id: string
  tipo: 'vencimiento_cuota' | 'moroso' | 'reserva_proxima' | 'espacio_mantenimiento' | 'cupo_lleno'
  mensaje: string
  persona_id: string | null
  espacio_id: string | null
  reserva_id: string | null
  fecha: string
  leida: boolean
  prioridad: 'baja' | 'media' | 'alta' | 'critica'
}

export type RolPersona = Persona['rol']
export type EstadoPersona = Persona['estado']
export type TipoEspacio = Espacio['tipo']
export type EstadoEspacio = Espacio['estado']
export type RolStaff = UsuarioStaff['rol']

// Alias de compatibilidad (páginas viejas todavía client-side)
export type TipoMovimiento = TipoMov
export type EstadoMovimiento = EstadoMov
export type DireccionMovimiento = DireccionMov