/**
 * Reset completo de la demo: deja la base en un estado coherente y "vistoso"
 * para mostrarle el sistema al complejo.
 *
 *   npm run seed            (base + auth + datos transaccionales)
 *
 * Requiere SUPABASE_SECRET_KEY en .env.local (para crear los usuarios de Auth).
 * Contraseña de todas las cuentas: 'turnex1234' (override con SEED_PASSWORD).
 *
 * Idempotente: se puede correr las veces que haga falta.
 */
import type { User } from '@supabase/supabase-js'
import { query, tx } from '@/lib/db'
import { createAdminClient } from '@/lib/supabase/admin'
import { generarCuotasDelMes, marcarCuotasVencidas } from '@/lib/services/cuota'
import { registrarPago, registrarCargoManual } from '@/lib/services/cuenta-corriente'
import { crearReserva } from '@/lib/services/reserva'
import { crearAbono } from '@/lib/services/abono'
import { crearPlanPago } from '@/lib/services/plan-pago'

const PASSWORD = process.env.SEED_PASSWORD || 'turnex1234'

function periodo(offsetMeses: number): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() + offsetMeses)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function fecha(offsetDias: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDias)
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------

async function limpiarTransaccional() {
  console.log('· Borrando datos transaccionales…')
  await tx(async (db) => {
    await db.query('delete from imputacion')
    await db.query('update cuota set movimiento_id = null')
    await db.query('update reserva set movimiento_id = null')
    await db.query('delete from movimiento')
    await db.query('delete from cuota')
    await db.query('delete from plan_pago')
    await db.query('delete from reserva')
    await db.query('delete from abono')
    await db.query('delete from acceso_log')
  })
}

async function upsertPlanes() {
  const planes = [
    ['Social', 15000, false, 0],
    ['Deportivo', 25000, false, 15],
    ['Full', 38000, true, 0],
  ] as const
  for (const [nombre, precio, incluye, desc] of planes) {
    await query(
      `insert into plan_membresia (nombre, precio_mensual, incluye_canchas, descuento_porcentaje, activo)
       select $1, $2, $3, $4, true
       where not exists (select 1 from plan_membresia where nombre = $1)`,
      [nombre, precio, incluye, desc]
    )
  }
  const { rows } = await query<{ id: string; nombre: string }>(
    'select id, nombre from plan_membresia'
  )
  return Object.fromEntries(rows.map((r) => [r.nombre, r.id])) as Record<string, string>
}

async function upsertEspacios() {
  const espacios = [
    ['Pádel 1', 'padel', 9000, 'Manzana A'],
    ['Pádel 2', 'padel', 9000, 'Manzana A'],
    ['Pádel 3', 'padel', 8000, 'Manzana A'],
    ['Tenis 1', 'tenis', 8000, 'Manzana B'],
    ['Tenis 2', 'tenis', 8000, 'Manzana B'],
    ['Vóley', 'voley', 6000, 'Manzana B'],
    ['Beach vóley', 'beach_voley', 6500, 'Manzana B'],
    ['Fútbol 5 - A', 'futbol', 12000, 'Fondo'],
    ['Fútbol 5 - B', 'futbol', 12000, 'Fondo'],
    ['Fútbol 7', 'futbol', 16000, 'Fondo'],
  ] as const
  for (const [nombre, tipo, precio, sector] of espacios) {
    await query(
      `insert into espacio (nombre, tipo, precio_por_hora, estado, sector)
       select $1, $2, $3, 'activa', $4
       where not exists (select 1 from espacio where nombre = $1)`,
      [nombre, tipo, precio, sector]
    )
  }
  const { rows } = await query<{ id: string; nombre: string }>('select id, nombre from espacio')
  return rows
}

async function upsertPersonas(planId: Record<string, string>) {
  const personas: [string, string, string, string, string, string | null][] = [
    // nombre, apellido, dni, rol, estado, plan
    ['Juan', 'Pérez', '30123456', 'socio', 'activo', 'Social'],
    ['María', 'González', '27890123', 'socio', 'activo', 'Deportivo'],
    ['Carlos', 'Rodríguez', '32456789', 'socio', 'moroso', 'Full'],
    ['Ana', 'Martínez', '29567890', 'socio', 'activo', 'Social'],
    ['Diego', 'Fernández', '33111222', 'socio', 'activo', 'Deportivo'],
    ['Lucía', 'Romero', '34222333', 'socio', 'activo', 'Full'],
    ['Martín', 'Sosa', '31333444', 'socio', 'activo', 'Social'],
    ['Sofía', 'Díaz', '35444555', 'socio', 'pendiente_aprobacion', null],
    ['Luis', 'Fernández', '31234567', 'invitado', 'activo', null],
    ['Paula', 'Acosta', '36555666', 'invitado', 'activo', null],
    ['Pedro', 'García', '25678901', 'profesor', 'activo', null],
    ['Laura', 'Sánchez', '26789012', 'profesor', 'activo', null],
    ['Roberto', 'Torres', '24567890', 'staff', 'activo', null],
    ['Lucía', 'Ramírez', '33456789', 'staff', 'activo', null],
  ]
  for (const [nombre, apellido, dni, rol, estado, plan] of personas) {
    await query(
      `insert into persona (nombre, apellido, dni, email, telefono, rol, estado, plan_membresia_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (dni) do update set
         nombre = excluded.nombre, apellido = excluded.apellido, rol = excluded.rol,
         estado = excluded.estado, plan_membresia_id = excluded.plan_membresia_id`,
      [
        nombre,
        apellido,
        dni,
        `${nombre}.${apellido}`.toLowerCase().normalize('NFD').replace(/[^a-z.]/g, '') + '@email.com',
        '11-4444-' + dni.slice(-4),
        rol,
        estado,
        plan ? planId[plan] : null,
      ]
    )
  }
  const { rows } = await query<{ id: string; dni: string; rol: string; estado: string }>(
    'select id, dni, rol, estado from persona'
  )
  return rows
}

async function ensureAuthUser(
  admin: ReturnType<typeof createAdminClient>,
  email: string
): Promise<User> {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, { password: PASSWORD })
    return existing
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  })
  if (error) throw error
  return data.user
}

async function vincularAuth() {
  console.log('· Usuarios de Auth (contraseña ' + PASSWORD + ')…')
  const admin = createAdminClient()

  // Staff
  const staff: [string, string][] = [
    ['admin@turnex.com', 'admin'],
    ['recepcion@turnex.com', 'recepcion'],
    ['cobranzas@turnex.com', 'cobranzas'],
  ]
  const robertoId = (await query<{ id: string }>("select id from persona where dni = '24567890'"))
    .rows[0]?.id
  const luciaId = (await query<{ id: string }>("select id from persona where dni = '33456789'"))
    .rows[0]?.id
  for (const [email, rol] of staff) {
    const user = await ensureAuthUser(admin, email)
    const personaId = email === 'admin@turnex.com' ? robertoId : email === 'recepcion@turnex.com' ? luciaId : null
    await query(
      `insert into usuario_staff (email, rol, persona_id, auth_user_id, activo)
       values ($1, $2, $3, $4, true)
       on conflict (email) do update set rol = excluded.rol, persona_id = excluded.persona_id,
         auth_user_id = excluded.auth_user_id`,
      [email, rol, personaId, user.id]
    )
    console.log(`  - ${email}`)
  }

  // Socio demo (María González)
  const socio = (await query<{ id: string }>("select id from persona where dni = '27890123'")).rows[0]
  if (socio) {
    const user = await ensureAuthUser(admin, 'socio@turnex.com')
    await query('update persona set auth_user_id = $1 where id = $2', [user.id, socio.id])
    console.log('  - socio@turnex.com (María González)')
  }
}

// ---------------------------------------------------------------------------

async function main() {
  console.log('\n🌱 Seed de Turnex\n')
  const planId = await upsertPlanes()
  const espacios = await upsertEspacios()
  const personas = await upsertPersonas(planId)
  await limpiarTransaccional()
  await vincularAuth()

  const staffId = (await query<{ id: string }>("select id from usuario_staff where rol='admin' limit 1"))
    .rows[0]?.id ?? null

  const socios = personas.filter((p) => p.rol === 'socio' && p.estado === 'activo')
  const invitados = personas.filter((p) => p.rol === 'invitado')

  console.log('\n· Cuotas del mes pasado y de este mes…')
  const g1 = await generarCuotasDelMes(periodo(-1), staffId)
  const g2 = await generarCuotasDelMes(periodo(0), staffId)
  console.log(`  ${g1.generadas + g2.generadas} cuotas generadas`)

  console.log('· Pagos de cuotas (mezcla al día / parcial / moroso)…')
  for (let i = 0; i < socios.length; i++) {
    const s = socios[i]
    const cargos = (
      await query<{ id: string; monto: number }>(
        "select id, monto from movimiento where persona_id=$1 and clase='cargo' and saldo>0 order by vence_el",
        [s.id]
      )
    ).rows
    if (i % 3 === 0 && cargos.length) {
      // paga todo
      const total = cargos.reduce((a, c) => a + Number(c.monto), 0)
      await registrarPago({ personaId: s.id, direccion: 'ingreso', monto: total, medioPago: 'transferencia', concepto: 'Cuotas al día', comprobanteUrl: null, registradoPor: staffId })
    } else if (i % 3 === 1 && cargos.length) {
      // paga la más vieja, debe el resto
      await registrarPago({ personaId: s.id, direccion: 'ingreso', monto: Number(cargos[0].monto), medioPago: 'efectivo', concepto: 'Pago 1 cuota', comprobanteUrl: null, registradoPor: staffId, imputaciones: [{ cargoId: cargos[0].id, monto: Number(cargos[0].monto) }] })
    }
    // i % 3 === 2 → no paga nada (queda vencida)
  }

  console.log('· Fiados de kiosco…')
  await registrarCargoManual({ personaId: socios[2].id, direccion: 'ingreso', tipo: 'venta', monto: 3500, concepto: '2 gatorade + 1 alfajor', venceEl: null, registradoPor: staffId })
  await registrarCargoManual({ personaId: socios[4].id, direccion: 'ingreso', tipo: 'venta', monto: 1800, concepto: '1 agua + 1 barrita', venceEl: null, registradoPor: staffId })

  console.log('· Plan de pago para el socio moroso…')
  const moroso = personas.find((p) => p.rol === 'socio' && p.estado === 'moroso')
  if (moroso) {
    await crearPlanPago(moroso.id, { descripcion: 'Deuda regularizada', total: 90000, cant_cuotas: 3, primer_vencimiento: fecha(20) }, staffId)
  }

  console.log('· Reservas de la semana…')
  const canchasPadel = espacios.filter((e) => e.nombre.startsWith('Pádel'))
  let creadas = 0
  for (let d = 1; d <= 6; d++) {
    for (const hora of ['18:00', '19:00', '20:00', '21:00']) {
      if (Math.random() > 0.55) continue
      const cancha = canchasPadel[Math.floor(Math.random() * canchasPadel.length)]
      const esInvitado = Math.random() > 0.7
      const persona = esInvitado
        ? invitados[Math.floor(Math.random() * invitados.length)]
        : socios[Math.floor(Math.random() * socios.length)]
      try {
        await crearReserva(
          {
            espacio_id: cancha.id,
            persona_id: persona.id,
            fecha: fecha(d),
            hora_inicio: hora,
            hora_fin: `${String(Number(hora.slice(0, 2)) + 1).padStart(2, '0')}:00`,
            cobrar_ahora: esInvitado,
            medio_pago: esInvitado ? 'efectivo' : undefined,
            notas: null,
          },
          staffId
        )
        creadas++
      } catch {
        /* horario ocupado, sigue */
      }
    }
  }
  console.log(`  ${creadas} reservas`)

  console.log('· Abono (turno fijo)…')
  const tenis1 = espacios.find((e) => e.nombre === 'Tenis 1')!
  await crearAbono(
    {
      persona_id: socios[0].id,
      espacio_id: tenis1.id,
      dia_semana: 3,
      hora_inicio: '20:00',
      hora_fin: '21:00',
      precio_mensual: 42000,
      vigente_desde: fecha(1),
    },
    staffId
  )

  await marcarCuotasVencidas()

  console.log('· Accesos de hoy…')
  const activos = personas.filter((p) => p.estado === 'activo').slice(0, 8)
  for (let i = 0; i < activos.length; i++) {
    const cerrado = i < activos.length - 2 // los últimos 2 quedan "dentro del predio"
    await query(
      `insert into acceso_log (persona_id, hora_entrada, hora_salida, registrado_por)
       values ($1, now() - ($2 || ' hours')::interval, $3, $4)`,
      [
        activos[i].id,
        String(3 - i * 0.3),
        cerrado ? new Date(Date.now() - i * 20 * 60000).toISOString() : null,
        staffId,
      ]
    )
  }

  console.log('\n✅ Listo. Entrá en /login con admin@turnex.com / ' + PASSWORD + '\n')
  process.exit(0)
}

main().catch((e) => {
  console.error('\n❌ Seed falló:', e)
  process.exit(1)
})
