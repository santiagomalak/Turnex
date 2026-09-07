'use client'

import { createClient } from '@/lib/supabase/client'
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
} from '@/lib/types-supabase'

const supabase = createClient()

function uid() {
  return crypto.randomUUID()
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value)
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

const today = new Date()
const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

export const store = {
  // ===== PLANES =====
  async getPlanes(): Promise<PlanMembresia[]> {
    const { data, error } = await supabase.from('plan_membresia').select('*').order('nombre')
    if (error) throw error
    return data || []
  },

  // ===== PERSONAS =====
  async getPersonas(): Promise<Persona[]> {
    const { data, error } = await supabase.from('persona').select('*').order('apellido')
    if (error) throw error
    return data || []
  },

  async getPersona(id: string): Promise<Persona | null> {
    const { data, error } = await supabase.from('persona').select('*').eq('id', id).single()
    if (error) return null
    return data
  },

  async addPersona(p: Omit<Persona, 'id'>): Promise<Persona> {
    const { data, error } = await supabase.from('persona').insert(p).select().single()
    if (error) throw error
    return data
  },

  async updatePersona(id: string, updates: Partial<Persona>): Promise<Persona | null> {
    const { data, error } = await supabase.from('persona').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async deletePersona(id: string): Promise<Persona | null> {
    const { data, error } = await supabase.from('persona').delete().eq('id', id).select().single()
    if (error) throw error
    return data
  },

  // ===== ESPACIOS =====
  async getEspacios(): Promise<Espacio[]> {
    const { data, error } = await supabase.from('espacio').select('*').order('nombre')
    if (error) throw error
    return data || []
  },

  async getEspacio(id: string): Promise<Espacio | null> {
    const { data, error } = await supabase.from('espacio').select('*').eq('id', id).single()
    if (error) return null
    return data
  },

  async addEspacio(e: Omit<Espacio, 'id'>): Promise<Espacio> {
    const { data, error } = await supabase.from('espacio').insert(e).select().single()
    if (error) throw error
    return data
  },

  async updateEspacio(id: string, updates: Partial<Espacio>): Promise<Espacio | null> {
    const { data, error } = await supabase.from('espacio').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async deleteEspacio(id: string): Promise<Espacio | null> {
    const { data, error } = await supabase.from('espacio').delete().eq('id', id).select().single()
    if (error) throw error
    return data
  },

  // ===== RESERVAS =====
  async getReservas(filtro?: { fecha?: string; espacioId?: string; personaId?: string }): Promise<Reserva[]> {
    let query = supabase.from('reserva').select('*')
    if (filtro?.fecha) query = query.eq('fecha', filtro.fecha)
    if (filtro?.espacioId) query = query.eq('espacio_id', filtro.espacioId)
    if (filtro?.personaId) query = query.eq('persona_id', filtro.personaId)
    const { data, error } = await query.order('fecha').order('hora_inicio')
    if (error) throw error
    return data || []
  },

  async getReserva(id: string): Promise<Reserva | null> {
    const { data, error } = await supabase.from('reserva').select('*').eq('id', id).single()
    if (error) return null
    return data
  },

  async addReserva(r: Omit<Reserva, 'id' | 'creado_en'>): Promise<Reserva> {
    const { data, error } = await supabase.from('reserva').insert(r).select().single()
    if (error) throw error
    return data
  },

  async updateReserva(id: string, updates: Partial<Reserva>): Promise<Reserva | null> {
    const { data, error } = await supabase.from('reserva').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async deleteReserva(id: string): Promise<Reserva | null> {
    const { data, error } = await supabase.from('reserva').delete().eq('id', id).select().single()
    if (error) throw error
    return data
  },

  // ===== CUOTAS =====
  async getCuotas(filtro?: { personaId?: string; estado?: Cuota['estado'] }): Promise<Cuota[]> {
    let query = supabase.from('cuota').select('*')
    if (filtro?.personaId) query = query.eq('persona_id', filtro.personaId)
    if (filtro?.estado) query = query.eq('estado', filtro.estado)
    const { data, error } = await query.order('periodo', { ascending: false })
    if (error) throw error
    return data || []
  },

  async getCuota(id: string): Promise<Cuota | null> {
    const { data, error } = await supabase.from('cuota').select('*').eq('id', id).single()
    if (error) return null
    return data
  },

  async updateCuota(id: string, updates: Partial<Cuota>): Promise<Cuota | null> {
    const { data, error } = await supabase.from('cuota').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  // ===== MOVIMIENTOS =====
  async getMovimientos(filtro?: { personaId?: string; tipo?: Movimiento['tipo'] }): Promise<Movimiento[]> {
    let query = supabase.from('movimiento').select('*')
    if (filtro?.personaId) query = query.eq('persona_id', filtro.personaId)
    if (filtro?.tipo) query = query.eq('tipo', filtro.tipo)
    const { data, error } = await query.order('fecha', { ascending: false })
    if (error) throw error
    return data || []
  },

  async addMovimiento(m: Omit<Movimiento, 'id'>): Promise<Movimiento> {
    const { data, error } = await supabase.from('movimiento').insert(m).select().single()
    if (error) throw error
    return data
  },

  // ===== ACCESOS =====
  async getAccesos(filtro?: { personaId?: string; fechaDesde?: string; fechaHasta?: string }): Promise<AccesoLog[]> {
    let query = supabase.from('acceso_log').select('*')
    if (filtro?.personaId) query = query.eq('persona_id', filtro.personaId)
    if (filtro?.fechaDesde) query = query.gte('hora_entrada', filtro.fechaDesde)
    if (filtro?.fechaHasta) query = query.lte('hora_entrada', filtro.fechaHasta)
    const { data, error } = await query.order('hora_entrada', { ascending: false })
    if (error) throw error
    return data || []
  },

  async addAcceso(a: Omit<AccesoLog, 'id'>): Promise<AccesoLog> {
    const { data, error } = await supabase.from('acceso_log').insert(a).select().single()
    if (error) throw error
    return data
  },

  async updateAcceso(id: string, updates: Partial<AccesoLog>): Promise<AccesoLog | null> {
    const { data, error } = await supabase.from('acceso_log').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  // ===== USUARIOS STAFF =====
  async getUsuariosStaff(): Promise<UsuarioStaff[]> {
    const { data, error } = await supabase.from('usuario_staff').select('*')
    if (error) throw error
    return data || []
  },

  async getStaffByEmail(email: string): Promise<UsuarioStaff | null> {
    const { data, error } = await supabase.from('usuario_staff').select('*').eq('email', email).single()
    if (error) return null
    return data
  },

  // ===== ALERTAS (se generan en tiempo real desde los datos) =====
  async getAlertas(noLeidas = false): Promise<Alerta[]> {
    const alertas: Alerta[] = []
    const now = new Date()
    const threeDaysFromNow = addDays(now, 3)

    // Cuotas vencidas y por vencer
    const { data: cuotas } = await supabase
      .from('cuota')
      .select('*, persona:persona(*)')
      .in('estado', ['pendiente', 'vencida'])

    if (cuotas) {
      for (const cuota of cuotas) {
        const vencimiento = new Date(cuota.fecha_vencimiento)
        const esVencida = cuota.estado === 'vencida' || vencimiento < now
        const porVencer = !esVencida && vencimiento <= threeDaysFromNow

        if (esVencida || porVencer) {
          const persona = cuota.persona as Persona | null
          if (persona) {
            alertas.push({
              id: uid(),
              tipo: esVencida ? 'moroso' : 'vencimiento_cuota',
              mensaje: esVencida
                ? `${persona.nombre} ${persona.apellido} tiene cuota vencida (${formatCurrency(cuota.monto)})`
                : `${persona.nombre} ${persona.apellido} vence cuota el ${cuota.fecha_vencimiento} (${formatCurrency(cuota.monto)})`,
              personaId: persona.id,
              fecha: now.toISOString(),
              leida: false,
              prioridad: esVencida ? 'alta' : 'media',
            })
          }
        }
      }
    }

    // Espacios en mantenimiento
    const { data: espaciosMant } = await supabase.from('espacio').select('*').eq('estado', 'mantenimiento')
    if (espaciosMant) {
      for (const e of espaciosMant) {
        alertas.push({
          id: uid(),
          tipo: 'espacio_mantenimiento',
          mensaje: `La ${e.nombre} está en mantenimiento`,
          espacioId: e.id,
          fecha: now.toISOString(),
          leida: false,
          prioridad: 'media',
        })
      }
    }

    // Reservas próximas (hoy)
    const { data: reservasHoy } = await supabase
      .from('reserva')
      .select('*, persona:persona(*), espacio:espacio(*)')
      .eq('fecha', formatDate(now))
      .eq('estado', 'confirmada')
      .order('hora_inicio')
      .limit(5)

    if (reservasHoy) {
      for (const r of reservasHoy) {
        const persona = r.persona as Persona | null
        const espacio = r.espacio as Espacio | null
        if (persona && espacio) {
          alertas.push({
            id: uid(),
            tipo: 'reserva_proxima',
            mensaje: `Reserva de ${persona.nombre} ${persona.apellido} en ${espacio.nombre} a las ${r.hora_inicio}`,
            personaId: persona.id,
            espacioId: espacio.id,
            reservaId: r.id,
            fecha: now.toISOString(),
            leida: false,
            prioridad: 'baja',
          })
        }
      }
    }

    // Ordenar por prioridad
    const prio = { critica: 4, alta: 3, media: 2, baja: 1 }
    alertas.sort((a, b) => prio[b.prioridad] - prio[a.prioridad] || new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

    return noLeidas ? alertas.filter(a => !a.leida) : alertas
  },

  // ===== STATS PARA DASHBOARD =====
  async getStats() {
    const [personas, cuotas, reservasHoy, espacios, movimientos, accesosHoy] = await Promise.all([
      supabase.from('persona').select('id, rol, estado').eq('rol', 'socio'),
      supabase.from('cuota').select('estado').in('estado', ['pendiente', 'vencida']),
      supabase.from('reserva').select('id', { count: 'exact' }).eq('fecha', formatDate(today)).eq('estado', 'confirmada'),
      supabase.from('espacio').select('id', { count: 'exact' }).eq('estado', 'activa'),
      supabase.from('movimiento').select('monto').gte('fecha', startOfMonth.toISOString()).lte('fecha', endOfMonth.toISOString()),
      supabase.from('acceso_log').select('id', { count: 'exact' }).gte('hora_entrada', formatDate(today)),
    ])

    const socios = personas.data || []
    const morosos = socios.filter(p => p.estado === 'moroso').length
    const cuotasData = cuotas.data || []
    const cuotasPendientes = cuotasData.filter(c => c.estado === 'pendiente').length
    const cuotasVencidas = cuotasData.filter(c => c.estado === 'vencida').length
    const ingresosMes = (movimientos.data || []).reduce((sum, m) => sum + m.monto, 0)

    return {
      totalSocios: socios.length,
      morosos,
      cuotasPendientes,
      cuotasVencidas,
      reservasHoy: reservasHoy.count || 0,
      espaciosActivos: espacios.count || 0,
      ingresosMes,
      accesosHoy: accesosHoy.count || 0,
      alertasNoLeidas: (await this.getAlertas(true)).length,
    }
  },

  formatCurrency,
  formatDate,
  addDays,
}

if (typeof window !== 'undefined') {
  (window as any).__store = store
}