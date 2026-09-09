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
}

export type Espacio = {
  id: string
  nombre: string
  tipo: 'futbol' | 'padel' | 'tenis' | 'voley' | 'beach_voley' | 'otro'
  precio_por_hora: number
  estado: 'activa' | 'mantenimiento'
}

export type Reserva = {
  id: string
  espacio_id: string
  persona_id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  estado: 'confirmada' | 'cancelada' | 'pendiente_pago'
  precio: number
  sena_pagada: boolean
  creado_en: string
}

export type Cuota = {
  id: string
  persona_id: string
  periodo: string
  monto: number
  estado: 'pendiente' | 'pagada' | 'vencida'
  fecha_vencimiento: string
}

export type Movimiento = {
  id: string
  persona_id: string
  cuota_id: string | null
  reserva_id: string | null
  tipo: 'cuota' | 'alquiler' | 'venta' | 'pago_staff'
  monto: number
  medio_pago: 'efectivo' | 'transferencia' | 'mercadopago' | 'modo' | 'debito_automatico' | 'fiado'
  comprobante_url: string | null
  registrado_por: string | null
  fecha: string
  estado: 'pendiente' | 'pagado'
  direccion: 'ingreso' | 'egreso'
  concepto: string | null
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
export type EstadoReserva = Reserva['estado']
export type EstadoCuota = Cuota['estado']
export type TipoMovimiento = Movimiento['tipo']
export type MedioPago = Movimiento['medio_pago']
export type EstadoMovimiento = Movimiento['estado']
export type DireccionMovimiento = Movimiento['direccion']
export type RolStaff = UsuarioStaff['rol']