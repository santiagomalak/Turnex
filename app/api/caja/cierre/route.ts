import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireStaff } from '@/lib/auth'

export async function POST() {
  try {
    const staff = await requireStaff(['admin', 'recepcion', 'cobranzas'])
    const supabase = await createClient()

    const today = new Date().toISOString().split('T')[0]
    const startOfDay = `${today}T00:00:00.000Z`
    const endOfDay = `${today}T23:59:59.999Z`

    // Obtener todos los movimientos del día
    const { data: movimientos, error: movError } = await supabase
      .from('movimiento')
      .select(`
        *,
        persona:persona_id (nombre, apellido, dni)
      `)
      .gte('fecha', startOfDay)
      .lte('fecha', endOfDay)
      .order('fecha', { ascending: true })

    if (movError) throw movError

    // Obtener accesos del día (para control de ingresos por acceso)
    const { data: accesos, error: accError } = await supabase
      .from('acceso_log')
      .select(`
        *,
        persona:persona_id (nombre, apellido)
      `)
      .gte('hora_entrada', startOfDay)
      .lte('hora_entrada', endOfDay)

    if (accError) throw accError

    // Obtener reservas confirmadas del día
    const { data: reservas, error: resError } = await supabase
      .from('reserva')
      .select(`
        *,
        espacio:espacio_id (nombre, precio_por_hora),
        persona:persona_id (nombre, apellido)
      `)
      .eq('fecha', today)
      .eq('estado', 'confirmada')

    if (resError) throw resError

    // Calcular totales por medio de pago
    const totalesPorMedio = (movimientos || []).reduce((acc, m) => {
      const medio = m.medio_pago
      if (!acc[medio]) {
        acc[medio] = { count: 0, total: 0, movimientos: [] }
      }
      acc[medio].count++
      acc[medio].total += m.monto
      acc[medio].movimientos.push(m)
      return acc
    }, {} as Record<string, { count: number; total: number; movimientos: any[] }>)

    // Calcular totales por tipo de movimiento
    const totalesPorTipo = (movimientos || []).reduce((acc, m) => {
      const tipo = m.tipo
      if (!acc[tipo]) {
        acc[tipo] = { count: 0, total: 0 }
      }
      acc[tipo].count++
      acc[tipo].total += m.monto
      return acc
    }, {} as Record<string, { count: number; total: number }>)

    // Total general
    const totalGeneral = (movimientos || []).reduce((sum, m) => sum + m.monto, 0)

    // Efectivo esperado vs real (para cuadre)
    const efectivoMovimientos = (movimientos || []).filter(m => m.medio_pago === 'efectivo')
    const totalEfectivo = efectivoMovimientos.reduce((sum, m) => sum + m.monto, 0)

    // Diferencias por tipo de pago
    const medios = ['efectivo', 'transferencia', 'mercadopago', 'modo', 'debito_automatico']
    const resumenMedios = medios.map(medio => {
      const data = totalesPorMedio[medio] || { count: 0, total: 0, movimientos: [] }
      return {
        medio,
        label: medio.charAt(0).toUpperCase() + medio.slice(1).replace('_', ' '),
        count: data.count,
        total: data.total,
      }
    })

    // Crear registro de cierre en BD (opcional: tabla cierre_caja)
    const cierreData = {
      fecha: today,
      staff_id: staff.staffId,
      total_general: totalGeneral,
      total_efectivo: totalEfectivo,
      total_transferencia: totalesPorMedio.transferencia?.total || 0,
      total_mercadopago: totalesPorMedio.mercadopago?.total || 0,
      total_modo: totalesPorMedio.modo?.total || 0,
      total_debito_automatico: totalesPorMedio.debito_automatico?.total || 0,
      movimientos_count: (movimientos || []).length,
      accesos_count: (accesos || []).length,
      reservas_count: (reservas || []).length,
      detalle_medios: JSON.stringify(resumenMedios),
      detalle_tipos: JSON.stringify(totalesPorTipo),
      creado_en: new Date().toISOString(),
    }

    // Insertar en tabla de cierres (crear tabla si no existe)
    const { error: cierreError } = await supabase
      .from('cierre_caja')
      .upsert(cierreData, { onConflict: 'fecha,staff_id' })

    if (cierreError) {
      // Si la tabla no existe, solo loguear
      console.warn('Tabla cierre_caja no existe, solo retornando datos:', cierreError.message)
    }

    return NextResponse.json({
      ok: true,
      fecha: today,
      resumen: {
        totalGeneral,
        totalEfectivo,
        totalMovimientos: (movimientos || []).length,
        totalAccesos: (accesos || []).length,
        totalReservas: (reservas || []).length,
      },
      porMedio: resumenMedios,
      porTipo: totalesPorTipo,
      movimientos: (movimientos || []).map(m => ({
        id: m.id,
        hora: new Date(m.fecha).toLocaleTimeString('es-AR'),
        persona: `${m.persona?.nombre} ${m.persona?.apellido}`,
        tipo: m.tipo,
        medio: m.medio_pago,
        monto: m.monto,
      })),
      accesos: (accesos || []).map(a => ({
        persona: `${a.persona?.nombre} ${a.persona?.apellido}`,
        entrada: new Date(a.hora_entrada).toLocaleTimeString('es-AR'),
        salida: a.hora_salida ? new Date(a.hora_salida).toLocaleTimeString('es-AR') : '—',
      })),
      reservas: (reservas || []).map(r => ({
        espacio: r.espacio?.nombre,
        hora: `${r.hora_inicio} - ${r.hora_fin}`,
        persona: `${r.persona?.nombre} ${r.persona?.apellido}`,
        precio: r.espacio?.precio_por_hora,
      })),
      cierre: cierreData,
    })
  } catch (error) {
    console.error('Error en cierre de caja:', error)
    return NextResponse.json(
      { ok: false, error: 'Error al generar cierre de caja' },
      { status: 500 }
    )
  }
}