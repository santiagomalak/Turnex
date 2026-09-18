'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { formatMoney } from '@/lib/format'
import type { AccesoConPersona } from '@/lib/repos/acceso'
import type { ResultadoBusqueda } from '@/lib/services/acceso'
import { buscarPersonaAction, entradaAction, salidaAction } from '../accesos/actions'
import { CheckCircle, XCircle, User, Clock, LogIn, LogOut, Search, QrCode } from 'lucide-react'

function hace(desde: string): { hrs: number; mins: number } {
  const min = Math.floor((Date.now() - new Date(desde).getTime()) / 60000)
  return { hrs: Math.floor(min / 60), mins: min % 60 }
}

export function KioscoClient({ dentroInicial }: { dentroInicial: AccesoConPersona[] }) {
  const router = useRouter()
  const [valor, setValor] = useState('')
  const [resultado, setResultado] = useState<ResultadoBusqueda | null>(null)
  const [lastAction, setLastAction] = useState<{ tipo: 'entry' | 'exit'; nombre: string; timestamp: Date } | null>(null)
  const [pending, start] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  // Refresco automático de "personas dentro" cada 30 s.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 30_000)
    return () => clearInterval(t)
  }, [router])

  const buscar = useCallback(() => {
    const v = valor.trim()
    if (!v) return
    start(async () => {
      const res = await buscarPersonaAction(v)
      if (res.ok) setResultado(res.data)
      else setResultado(null)
    })
  }, [valor])

  const registrarEntrada = useCallback(() => {
    if (!resultado?.encontrada) return
    const persona = resultado.persona
    start(async () => {
      const res = await entradaAction(persona.id)
      if (res.ok) {
        setLastAction({ tipo: 'entry', nombre: `${persona.nombre} ${persona.apellido}`, timestamp: new Date() })
        setResultado(null)
        setValor('')
        inputRef.current?.focus()
        router.refresh()
      }
    })
  }, [resultado, router])

  const registrarSalida = useCallback(() => {
    if (!resultado?.encontrada) return
    const persona = resultado.persona
    start(async () => {
      const res = await salidaAction(persona.id)
      if (res.ok) {
        setLastAction({ tipo: 'exit', nombre: `${persona.nombre} ${persona.apellido}`, timestamp: new Date() })
        setResultado(null)
        setValor('')
        inputRef.current?.focus()
        router.refresh()
      }
    })
  }, [resultado, router])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter' && valor.trim() && !resultado) buscar()
      if (e.key === 'ArrowUp' && !pending) {
        e.preventDefault()
        if (resultado?.encontrada && !resultado.dentro) registrarEntrada()
      }
      if (e.key === 'ArrowDown' && !pending) {
        e.preventDefault()
        if (resultado?.encontrada && resultado.dentro) registrarSalida()
      }
      if (e.key === 'Escape') {
        setResultado(null)
        setValor('')
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [valor, resultado, pending, buscar, registrarEntrada, registrarSalida])

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <QrCode className="w-10 h-10 text-emerald-400" />
            <div>
              <h1 className="text-2xl font-bold">Turnex Kiosco</h1>
              <p className="text-zinc-400 text-sm">Control de acceso - Escanee DNI o QR</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-zinc-400">
            <div className="text-right">
              <p className="text-xs">Personas dentro</p>
              <p className="text-2xl font-bold text-emerald-400">{dentroInicial.length}</p>
            </div>
            <div className="w-px h-8 bg-zinc-700" />
            <div id="clock" className="font-mono text-lg" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Scanner Area */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Escáner DNI / QR
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="relative">
                <Input
                  ref={inputRef}
                  label="DNI / Código QR"
                  value={valor}
                  onChange={e => setValor(e.target.value)}
                  placeholder="30123456"
                  autoFocus
                  className="text-2xl text-center"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">
                  <QrCode className="w-8 h-8" />
                </div>
              </div>

              {!resultado && (
                <Button size="lg" className="w-full h-14 text-lg" onClick={buscar} loading={pending} disabled={!valor.trim()}>
                  <Search className="w-5 h-5 mr-2" />
                  Buscar
                </Button>
              )}

              {resultado?.encontrada === false && (
                <Alert variant="danger" className="bg-zinc-800 border-zinc-700">
                  <XCircle className="w-5 h-5" />
                  <p>No se encontró ninguna persona con <strong>{valor}</strong></p>
                </Alert>
              )}

              {resultado?.encontrada && (
                <>
                  <Alert
                    variant={resultado.persona.estado === 'activo' ? 'success' : resultado.persona.estado === 'moroso' ? 'danger' : 'warning'}
                    className="bg-zinc-800 border-zinc-700"
                  >
                    <div className="flex items-center gap-3">
                      <User className="w-10 h-10" />
                      <div>
                        <p className="font-bold text-lg">{resultado.persona.nombre} {resultado.persona.apellido}</p>
                        <p className="text-sm text-zinc-300">DNI: {resultado.persona.dni ?? '—'} • {resultado.persona.rol}</p>
                        {resultado.dentro && <p className="text-sm text-emerald-400 mt-1">Ya está dentro del predio</p>}
                      </div>
                      <Badge
                        variant={resultado.persona.estado === 'activo' ? 'success' : resultado.persona.estado === 'moroso' ? 'danger' : 'default'}
                        className="ml-auto text-lg px-3 py-1"
                      >
                        {resultado.persona.estado.toUpperCase()}
                      </Badge>
                    </div>
                    {resultado.deuda.vencida > 0 && (
                      <p className="mt-2 text-amber-300 text-sm">⚠️ Debe {formatMoney(resultado.deuda.vencida)} vencido — ¿Permitir ingreso?</p>
                    )}
                  </Alert>

                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      size="lg"
                      className="h-20 text-xl"
                      onClick={registrarEntrada}
                      disabled={pending || resultado.dentro}
                      loading={pending}
                    >
                      <LogIn className="w-6 h-6 mr-2" />
                      ENTRADA
                    </Button>
                    <Button
                      size="lg"
                      variant="secondary"
                      className="h-20 text-xl"
                      onClick={registrarSalida}
                      disabled={pending || !resultado.dentro}
                      loading={pending}
                    >
                      <LogOut className="w-6 h-6 mr-2" />
                      SALIDA
                    </Button>
                  </div>
                </>
              )}

              {lastAction && (
                <Alert variant={lastAction.tipo === 'entry' ? 'success' : 'info'} className="bg-zinc-800 border-zinc-700">
                  <div className="flex items-center gap-3">
                    {lastAction.tipo === 'entry' ? <CheckCircle className="w-6 h-6 text-green-400" /> : <Clock className="w-6 h-6 text-blue-400" />}
                    <div>
                      <p className="font-bold">{lastAction.tipo === 'entry' ? '✓ Entrada registrada' : '✓ Salida registrada'}</p>
                      <p className="text-sm">{lastAction.nombre} • {lastAction.timestamp.toLocaleTimeString()}</p>
                    </div>
                  </div>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Personas dentro */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Dentro del predio ({dentroInicial.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {dentroInicial.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <User className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">Nadie dentro del predio</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {dentroInicial.map((a) => {
                    const { hrs, mins } = hace(a.hora_entrada)
                    return (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <User className="w-6 h-6 text-emerald-400" />
                          </div>
                          <div>
                            <p className="font-medium">{a.nombre} {a.apellido}</p>
                            <p className="text-sm text-zinc-400">{a.dni ?? '—'} • {a.rol}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-emerald-400">Hace {hrs}h {mins}m</p>
                          <p className="text-xs text-zinc-500">Entró: {new Date(a.hora_entrada).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Shortcuts help */}
        <div className="mt-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg text-center text-sm text-zinc-400">
          <kbd className="px-2 py-1 bg-zinc-800 rounded border border-zinc-700 mx-1">⌘K</kbd> Buscar global |
          <kbd className="px-2 py-1 bg-zinc-800 rounded border border-zinc-700 mx-1">↑</kbd> Entrada |
          <kbd className="px-2 py-1 bg-zinc-800 rounded border border-zinc-700 mx-1">↓</kbd> Salida |
          <kbd className="px-2 py-1 bg-zinc-800 rounded border border-zinc-700 mx-1">Esc</kbd> Limpiar
        </div>
      </main>

      {/* Clock */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            setInterval(() => {
              const el = document.getElementById('clock');
              if (el) el.textContent = new Date().toLocaleTimeString('es-AR');
            }, 1000);
          `,
        }}
      />
    </div>
  )
}
