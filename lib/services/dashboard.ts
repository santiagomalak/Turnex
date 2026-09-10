import 'server-only'
import { query } from '@/lib/db'
import { periodoActual } from '@/lib/services/cuota'

export type Dashboard = {
  sociosActivos: number
  sociosConDeudaVencida: number
  deudaTotal: number
  deudaVencida: number
  cuotasPendientes: number
  cuotasVencidas: number
  reservasHoy: number
  canchasActivas: number
  personasDentro: number
  accesosHoy: number
  ingresosMes: number
  egresosMes: number
  proximosVencimientos: {
    persona: string
    concepto: string
    fecha_vencimiento: string
    saldo: number
    vencida: boolean
  }[]
  ultimosPagos: { persona: string; fecha: string; monto: number; medio: string | null }[]
  ocupacionHoy: { espacio: string; reservas: number; porcentaje: number }[]
  alertas: { tipo: string; mensaje: string; prioridad: 'alta' | 'media' | 'baja' }[]
}

const FRANJAS_DIA = 15 // 07:00–22:00

export async function getDashboard(): Promise<Dashboard> {
  const periodo = periodoActual()

  const [
    socios,
    deuda,
    cuotas,
    reservasHoy,
    canchas,
    dentro,
    accesosHoy,
    movMes,
    vencimientos,
    pagos,
    ocupacion,
    mantenimiento,
  ] = await Promise.all([
    query<{ activos: number }>(
      "select count(*)::int as activos from persona where rol = 'socio' and estado = 'activo'"
    ),
    query<{ total: number; vencida: number; personas_vencida: number }>(
      `select coalesce(sum(saldo), 0) as total,
              coalesce(sum(saldo) filter (where vence_el is not null and vence_el < current_date), 0) as vencida,
              count(distinct persona_id) filter (where vence_el is not null and vence_el < current_date) as personas_vencida
       from movimiento
       where clase = 'cargo' and direccion = 'ingreso' and saldo > 0 and not anulado`
    ),
    query<{ pendientes: number; vencidas: number }>(
      `select count(*) filter (where estado in ('pendiente', 'parcial'))::int as pendientes,
              count(*) filter (where estado = 'vencida')::int as vencidas
       from cuota`
    ),
    query<{ n: number }>(
      "select count(*)::int as n from reserva where fecha = current_date and estado in ('confirmada', 'cumplida')"
    ),
    query<{ n: number }>("select count(*)::int as n from espacio where estado = 'activa'"),
    query<{ n: number }>('select count(*)::int as n from acceso_log where hora_salida is null'),
    query<{ n: number }>(
      'select count(*)::int as n from acceso_log where hora_entrada::date = current_date'
    ),
    query<{ ingresos: number; egresos: number }>(
      `select coalesce(sum(monto) filter (where direccion = 'ingreso'), 0) as ingresos,
              coalesce(sum(monto) filter (where direccion = 'egreso'), 0) as egresos
       from movimiento
       where clase = 'pago' and not anulado and date_trunc('month', fecha) = $1::date`,
      [periodo]
    ),
    query<{
      persona: string
      concepto: string
      fecha_vencimiento: string
      saldo: number
      vencida: boolean
    }>(
      `select p.nombre || ' ' || p.apellido as persona,
              coalesce(c.concepto, 'Cuota ' || to_char(c.periodo, 'MM/YYYY')) as concepto,
              c.fecha_vencimiento,
              coalesce(m.saldo, c.monto) as saldo,
              c.fecha_vencimiento < current_date as vencida
       from cuota c
       join persona p on p.id = c.persona_id
       left join movimiento m on m.id = c.movimiento_id and not m.anulado
       where c.estado in ('pendiente', 'parcial', 'vencida')
       order by c.fecha_vencimiento
       limit 6`
    ),
    query<{ persona: string; fecha: string; monto: number; medio: string | null }>(
      `select p.nombre || ' ' || p.apellido as persona, m.fecha, m.monto, m.medio_pago as medio
       from movimiento m
       join persona p on p.id = m.persona_id
       where m.clase = 'pago' and m.direccion = 'ingreso' and not m.anulado
       order by m.fecha desc
       limit 6`
    ),
    query<{ espacio: string; reservas: number }>(
      `select e.nombre as espacio, count(r.id)::int as reservas
       from espacio e
       left join reserva r on r.espacio_id = e.id and r.fecha = current_date and r.estado <> 'cancelada'
       where e.estado = 'activa'
       group by e.nombre
       order by e.nombre`
    ),
    query<{ nombre: string }>("select nombre from espacio where estado = 'mantenimiento'"),
  ])

  const alertas: Dashboard['alertas'] = []
  if (cuotas.rows[0].vencidas > 0) {
    alertas.push({
      tipo: 'cuotas_vencidas',
      mensaje: `${cuotas.rows[0].vencidas} cuota(s) vencida(s) sin pagar`,
      prioridad: 'alta',
    })
  }
  if (deuda.rows[0].personas_vencida > 0) {
    alertas.push({
      tipo: 'morosos',
      mensaje: `${deuda.rows[0].personas_vencida} persona(s) con deuda vencida en cuenta corriente`,
      prioridad: 'alta',
    })
  }
  for (const m of mantenimiento.rows) {
    alertas.push({ tipo: 'mantenimiento', mensaje: `${m.nombre} está en mantenimiento`, prioridad: 'media' })
  }

  return {
    sociosActivos: socios.rows[0].activos,
    sociosConDeudaVencida: deuda.rows[0].personas_vencida,
    deudaTotal: deuda.rows[0].total,
    deudaVencida: deuda.rows[0].vencida,
    cuotasPendientes: cuotas.rows[0].pendientes,
    cuotasVencidas: cuotas.rows[0].vencidas,
    reservasHoy: reservasHoy.rows[0].n,
    canchasActivas: canchas.rows[0].n,
    personasDentro: dentro.rows[0].n,
    accesosHoy: accesosHoy.rows[0].n,
    ingresosMes: movMes.rows[0].ingresos,
    egresosMes: movMes.rows[0].egresos,
    proximosVencimientos: vencimientos.rows,
    ultimosPagos: pagos.rows,
    ocupacionHoy: ocupacion.rows.map((o) => ({
      espacio: o.espacio,
      reservas: o.reservas,
      porcentaje: Math.min(100, Math.round((o.reservas / FRANJAS_DIA) * 100)),
    })),
    alertas,
  }
}
