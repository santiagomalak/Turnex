import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

function uid() { return crypto.randomUUID() }
function addDays(date: Date, days: number) { const d = new Date(date); d.setDate(d.getDate() + days); return d }
function formatDate(date: Date) { return date.toISOString().split('T')[0] }

async function seed() {
  console.log('🌱 Iniciando seed de datos...')

  // 1. Planes de membresía
  const planes = [
    { id: uid(), nombre: 'Social', precio_mensual: 15000, incluye_canchas: false, descuento_porcentaje: 0 },
    { id: uid(), nombre: 'Deportivo', precio_mensual: 25000, incluye_canchas: true, descuento_porcentaje: 10 },
    { id: uid(), nombre: 'Full', precio_mensual: 35000, incluye_canchas: true, descuento_porcentaje: 20 },
  ]
  await supabase.from('plan_membresia').upsert(planes)
  console.log('✅ Planes creados')

  // 2. Personas
  const personasData = [
    { id: uid(), nombre: 'Juan', apellido: 'Pérez', dni: '30123456', email: 'juan.perez@email.com', telefono: '11-4444-1111', rol: 'socio', estado: 'activo', fecha_alta: '2023-03-15', plan_membresia_id: '' },
    { id: uid(), nombre: 'María', apellido: 'González', dni: '27890123', email: 'maria.gonzalez@email.com', telefono: '11-4444-2222', rol: 'socio', estado: 'activo', fecha_alta: '2022-11-20', plan_membresia_id: '' },
    { id: uid(), nombre: 'Carlos', apellido: 'Rodríguez', dni: '32456789', email: 'carlos.rodriguez@email.com', telefono: '11-4444-3333', rol: 'socio', estado: 'moroso', fecha_alta: '2024-01-10', plan_membresia_id: '' },
    { id: uid(), nombre: 'Ana', apellido: 'Martínez', dni: '29567890', email: 'ana.martinez@email.com', telefono: '11-4444-4444', rol: 'socio', estado: 'activo', fecha_alta: '2023-07-05', plan_membresia_id: '' },
    { id: uid(), nombre: 'Luis', apellido: 'Fernández', dni: '31234567', email: 'luis.fernandez@email.com', telefono: '11-4444-5555', rol: 'invitado', estado: 'activo', fecha_alta: '2024-08-01', plan_membresia_id: null },
    { id: uid(), nombre: 'Sofía', apellido: 'López', dni: '28901234', email: 'sofia.lopez@email.com', telefono: '11-4444-6666', rol: 'invitado', estado: 'activo', fecha_alta: '2024-08-15', plan_membresia_id: null },
    { id: uid(), nombre: 'Pedro', apellido: 'García', dni: '25678901', email: 'pedro.garcia@email.com', telefono: '11-4444-7777', rol: 'profesor', estado: 'activo', fecha_alta: '2022-05-01', plan_membresia_id: null },
    { id: uid(), nombre: 'Laura', apellido: 'Sánchez', dni: '26789012', email: 'laura.sanchez@email.com', telefono: '11-4444-8888', rol: 'profesor', estado: 'activo', fecha_alta: '2023-02-15', plan_membresia_id: null },
    { id: uid(), nombre: 'Roberto', apellido: 'Torres', dni: '24567890', email: 'roberto.torres@email.com', telefono: '11-4444-9999', rol: 'staff', estado: 'activo', fecha_alta: '2021-10-01', plan_membresia_id: null },
    { id: uid(), nombre: 'Lucía', apellido: 'Ramírez', dni: '33456789', email: 'lucia.ramirez@email.com', telefono: '11-4444-0000', rol: 'staff', estado: 'activo', fecha_alta: '2023-09-01', plan_membresia_id: null },
  ]

  // Asignar planes a socios
  personasData.forEach((p, i) => {
    if (p.rol === 'socio') p.plan_membresia_id = planes[i % 3].id
  })

  await supabase.from('persona').upsert(personasData)
  console.log('✅ Personas creadas')

  // 3. Espacios
  const espaciosData = [
    { id: uid(), nombre: 'Cancha Fútbol 1', tipo: 'futbol', precio_por_hora: 12000, estado: 'activa' },
    { id: uid(), nombre: 'Cancha Fútbol 2', tipo: 'futbol', precio_por_hora: 12000, estado: 'activa' },
    { id: uid(), nombre: 'Cancha Fútbol 3', tipo: 'futbol', precio_por_hora: 10000, estado: 'mantenimiento' },
    { id: uid(), nombre: 'Cancha Pádel 1', tipo: 'padel', precio_por_hora: 8000, estado: 'activa' },
    { id: uid(), nombre: 'Cancha Pádel 2', tipo: 'padel', precio_por_hora: 8000, estado: 'activa' },
    { id: uid(), nombre: 'Cancha Pádel 3', tipo: 'padel', precio_por_hora: 7000, estado: 'activa' },
    { id: uid(), nombre: 'Cancha Tenis 1', tipo: 'tenis', precio_por_hora: 9000, estado: 'activa' },
    { id: uid(), nombre: 'Cancha Vóley 1', tipo: 'voley', precio_por_hora: 6000, estado: 'activa' },
  ]
  await supabase.from('espacio').upsert(espaciosData)
  console.log('✅ Espacios creados')

  // 4. Usuarios Staff
  const staffData = [
    { id: uid(), persona_id: personasData.find(p => p.email === 'roberto.torres@email.com')?.id, email: 'admin@turnex.com', rol: 'admin', activo: true },
    { id: uid(), persona_id: personasData.find(p => p.email === 'lucia.ramirez@email.com')?.id, email: 'recepcion@turnex.com', rol: 'recepcion', activo: true },
    { id: uid(), persona_id: null, email: 'cobranzas@turnex.com', rol: 'cobranzas', activo: true },
  ]
  await supabase.from('usuario_staff').upsert(staffData)
  console.log('✅ Staff creado')

  // 5. Cuotas (mes actual)
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const cuotasData = personasData
    .filter(p => p.rol === 'socio' && p.plan_membresia_id)
    .map(p => {
      const plan = planes.find(pl => pl.id === p.plan_membresia_id)!
      const estado = p.estado === 'moroso' ? 'vencida' : Math.random() > 0.3 ? 'pagada' : 'pendiente'
      return {
        id: uid(),
        persona_id: p.id,
        periodo: formatDate(startOfMonth),
        monto: plan.precio_mensual,
        estado,
        fecha_vencimiento: formatDate(addDays(startOfMonth, 10)),
      }
    })
  await supabase.from('cuota').upsert(cuotasData)
  console.log('✅ Cuotas creadas')

  // 6. Reservas (2 semanas)
  const socios = personasData.filter(p => p.rol === 'socio' || p.rol === 'invitado')
  const espaciosActivos = espaciosData.filter(e => e.estado === 'activa')
  const horarios = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00']

  const reservasData = []
  for (let day = 0; day < 14; day++) {
    const fecha = formatDate(addDays(today, day))
    for (const espacio of espaciosActivos) {
      const numReservas = Math.floor(Math.random() * 4)
      const horariosUsados = new Set<string>()
      for (let r = 0; r < numReservas; r++) {
        const horaIdx = Math.floor(Math.random() * horarios.length)
        const horaInicio = horarios[horaIdx]
        if (horariosUsados.has(horaInicio)) continue
        horariosUsados.add(horaInicio)
        const horaFin = horarios[horaIdx + 1] || '22:00'
        const socio = socios[Math.floor(Math.random() * socios.length)]
        const estado = Math.random() > 0.2 ? 'confirmada' : 'pendiente_pago'
        reservasData.push({
          id: uid(),
          espacio_id: espacio.id,
          persona_id: socio.id,
          fecha,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          estado,
          precio: espacio.precio_por_hora,
          sena_pagada: estado === 'confirmada',
          creado_en: new Date(Date.now() - Math.floor(Math.random() * 10) * 86400000).toISOString(),
        })
      }
    }
  }
  await supabase.from('reserva').upsert(reservasData)
  console.log('✅ Reservas creadas')

  // 7. Movimientos (pagos)
  const movimientosData = []
  // Pagos de cuotas
  for (const cuota of cuotasData.filter(c => c.estado === 'pagada')) {
    movimientosData.push({
      id: uid(),
      persona_id: cuota.persona_id,
      cuota_id: cuota.id,
      tipo: 'cuota',
      monto: cuota.monto,
      medio_pago: ['efectivo', 'transferencia', 'mercadopago'][Math.floor(Math.random() * 3)] as any,
      registrado_por: staffData[0].id,
      fecha: new Date(Date.now() - Math.floor(Math.random() * 5) * 86400000).toISOString(),
    })
  }
  // Pagos de reservas
  for (const reserva of reservasData.filter(r => r.estado === 'confirmada')) {
    if (Math.random() > 0.3) {
      movimientosData.push({
        id: uid(),
        persona_id: reserva.persona_id,
        reserva_id: reserva.id,
        tipo: 'alquiler',
        monto: reserva.precio,
        medio_pago: ['efectivo', 'transferencia', 'mercadopago'][Math.floor(Math.random() * 3)] as any,
        registrado_por: staffData[1].id,
        fecha: new Date(`${reserva.fecha}T${reserva.hora_inicio}`).toISOString(),
      })
    }
  }
  await supabase.from('movimiento').upsert(movimientosData)
  console.log('✅ Movimientos creados')

  // 8. Accesos (7 días)
  const sociosActivos = personasData.filter(p => p.estado === 'activo')
  const accesosData = []
  for (let day = 0; day < 7; day++) {
    const fechaBase = addDays(today, -day)
    const numAccesos = Math.floor(Math.random() * 20) + 10
    for (let i = 0; i < numAccesos; i++) {
      const persona = sociosActivos[Math.floor(Math.random() * sociosActivos.length)]
      const horaEntrada = new Date(fechaBase)
      horaEntrada.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60))
      const horaSalida = Math.random() > 0.3 ? new Date(horaEntrada.getTime() + (60 + Math.random() * 120) * 60000) : null
      accesosData.push({
        id: uid(),
        persona_id: persona.id,
        hora_entrada: horaEntrada.toISOString(),
        hora_salida: horaSalida?.toISOString() || null,
        registrado_por: staffData[1].id,
      })
    }
  }
  await supabase.from('acceso_log').upsert(accesosData)
  console.log('✅ Accesos creados')

  console.log('🎉 Seed completado!')
}

seed().catch(console.error)