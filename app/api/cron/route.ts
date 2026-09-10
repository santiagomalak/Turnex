import { NextResponse } from 'next/server'
import { correrTareasProgramadas } from '@/lib/services/tareas-programadas'

// Endpoint que dispara Vercel Cron (config en vercel.json) una vez por día.
// Se protege con CRON_SECRET: Vercel manda `Authorization: Bearer <CRON_SECRET>`.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const resultado = await correrTareasProgramadas()
    console.log('[cron] tareas programadas:', resultado)
    return NextResponse.json({ ok: true, resultado })
  } catch (err) {
    console.error('[cron] error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
