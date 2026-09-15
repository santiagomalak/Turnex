'use client'

import { useState, useEffect, useCallback } from 'react'
import { store } from '../../../lib/store-supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { useToast } from '@/hooks/useToast'
import type { Persona, AccesoLog } from '../../../lib/types-supabase'
import { CheckCircle, XCircle, User, Clock, LogIn, LogOut, Search, QrCode } from 'lucide-react'

export default function KioscoPage() {
  const [searchDni, setSearchDni] = useState('')
  const [foundPersona, setFoundPersona] = useState<Persona | null>(null)
  const [checkinLoading, setCheckinLoading] = useState<'entry' | 'exit' | false>(false)
  const [lastAction, setLastAction] = useState<{ type: 'entry' | 'exit'; persona: Persona; timestamp: Date } | null>(null)
  const [personasDentro, setPersonasDentro] = useState<Array<{ persona: Persona; acceso: AccesoLog; hrs: number; mins: number }>>([])
  const [loading, setLoading] = useState(true)
  const { success, error: toastError, info } = useToast()

  const loadPersonasDentro = useCallback(async () => {
    try {
      const accesosAbiertos = (await store.getAccesos()).filter(a => !a.hora_salida)
      const personas = await store.getPersonas()
      const dentro = accesosAbiertos.map(acceso => {
        const persona = personas.find(p => p.id === acceso.persona_id)
        if (!persona) return null
        const duracion = Date.now() - new Date(acceso.hora_entrada).getTime()
        const hrs = Math.floor(duracion / 3600000)
        const mins = Math.floor((duracion % 3600000) / 60000)
        return { persona, acceso, hrs, mins }
      }).filter(Boolean) as Array<{ persona: Persona; acceso: AccesoLog; hrs: number; mins: number }>
      setPersonasDentro(dentro)
    } catch (err) {
      console.error('Error loading personas dentro:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPersonasDentro()
    const interval = setInterval(loadPersonasDentro, 30000)
    return () => clearInterval(interval)
  }, [loadPersonasDentro])

  const handleDniSearch = () => {
    const dni = searchDni.trim()
    if (!dni) return
    // En modo kiosco, buscamos en la lista de personas ya cargadas o hacemos una búsqueda directa
    // Para simplificar, usamos el store local
    setFoundPersona(null)
    // Simulamos búsqueda - en producción usarías una búsqueda real
    setTimeout(() => {
      // Aquí harías la búsqueda real en la BD
      setFoundPersona(null)
    }, 100)
  }

  const handleCheckin = async (tipo: 'entry' | 'exit') => {
    if (!foundPersona && !searchDni.trim()) return
    setCheckinLoading(tipo)
    try {
      const staff = (await store.getUsuariosStaff())[0] || { id: 'system' }
      if (tipo === 'entry') {
        // Para el kiosco, creamos o buscamos la persona por DNI
        const dni = searchDni.trim()
        let persona = foundPersona
        if (!persona) {
          // Buscar en BD o crear temporal
          const personas = await store.getPersonas()
          persona = personas.find(p => p.dni === dni) || null
        }
        if (persona) {
          await store.addAcceso({ persona_id: persona.id, hora_entrada: new Date().toISOString(), hora_salida: null, registrado_por: staff.id })
          success(`Entrada registrada: ${persona.nombre} ${persona.apellido}`)
          setLastAction({ type: 'entry', persona, timestamp: new Date() })
        } else {
          info(`DNI ${dni} no encontrado. ¿Registrar como invitado?`)
        }
      } else {
        const accesosAbiertos = (await store.getAccesos({ personaId: foundPersona?.id })).filter(a => !a.hora_salida)
        if (accesosAbiertos.length > 0) {
          await store.updateAcceso(accesosAbiertos[0].id, { hora_salida: new Date().toISOString() })
          success(`Salida registrada: ${foundPersona?.nombre} ${foundPersona?.apellido}`)
          setLastAction({ type: 'exit', persona: foundPersona!, timestamp: new Date() })
        }
      }
      loadPersonasDentro()
      setSearchDni('')
      setFoundPersona(null)
    } catch (err) {
      console.error('Error checkin:', err)
      toastError('Error al registrar')
    } finally {
      setCheckinLoading(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && searchDni.trim()) {
      handleDniSearch()
    }
    if (e.key === 'ArrowUp' && checkinLoading === false) {
      e.preventDefault()
      if (foundPersona) handleCheckin('entry')
    }
    if (e.key === 'ArrowDown' && checkinLoading === false) {
      e.preventDefault()
      if (foundPersona) handleCheckin('exit')
    }
    if (e.key === 'Escape') {
      setFoundPersona(null)
      setSearchDni('')
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [foundPersona, checkinLoading])

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
              <p className="text-2xl font-bold text-emerald-400">{personasDentro.length}</p>
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
                  label="DNI / Código QR"
                  value={searchDni}
                  onChange={e => setSearchDni(e.target.value.toUpperCase())}
                  placeholder="30123456"
                  autoFocus
                  className="text-2xl text-center"
                  onKeyDown={e => e.key === 'Enter' && handleDniSearch()}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">
                  <QrCode className="w-8 h-8" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  size="lg"
                  className="h-20 text-xl"
                  onClick={() => handleCheckin('entry')}
                  disabled={checkinLoading === 'entry' || !searchDni.trim()}
                  loading={checkinLoading === 'entry'}
                >
                  <LogIn className="w-6 h-6 mr-2" />
                  ENTRADA
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-20 text-xl"
                  onClick={() => handleCheckin('exit')}
                  disabled={checkinLoading === 'exit' || !foundPersona}
                  loading={checkinLoading === 'exit'}
                >
                  <LogOut className="w-6 h-6 mr-2" />
                  SALIDA
                </Button>
              </div>

              {foundPersona && (
                <Alert variant={foundPersona.estado === 'activo' ? 'success' : foundPersona.estado === 'moroso' ? 'danger' : 'warning'}
                  className="bg-zinc-800 border-zinc-700"
                >
                  <div className="flex items-center gap-3">
                    <User className="w-10 h-10" />
                    <div>
                      <p className="font-bold text-lg">{foundPersona.nombre} {foundPersona.apellido}</p>
                      <p className="text-sm text-zinc-300">DNI: {foundPersona.dni} • {foundPersona.rol}</p>
                      <p className="text-sm text-zinc-300">Plan: {foundPersona.plan_membresia_id || 'Sin plan'}</p>
                    </div>
                    <Badge
                      variant={foundPersona.estado === 'activo' ? 'success' : foundPersona.estado === 'moroso' ? 'danger' : 'default'}
                      className="ml-auto text-lg px-3 py-1"
                    >
                      {foundPersona.estado.toUpperCase()}
                    </Badge>
                  </div>
                  {foundPersona.estado === 'moroso' && (
                    <p className="mt-2 text-amber-300 text-sm">⚠️ Cuotas vencidas - ¿Permitir ingreso?</p>
                  )}
                </Alert>
              )}

              {!foundPersona && searchDni && (
                <Alert variant="danger" className="bg-zinc-800 border-zinc-700">
                  <XCircle className="w-5 h-5" />
                  <p>DNI <strong>{searchDni}</strong> no encontrado en el sistema</p>
                </Alert>
              )}

              {lastAction && (
                <Alert variant={lastAction.type === 'entry' ? 'success' : 'info'} className="bg-zinc-800 border-zinc-700">
                  <div className="flex items-center gap-3">
                    {lastAction.type === 'entry' ? <CheckCircle className="w-6 h-6 text-green-400" /> : <Clock className="w-6 h-6 text-blue-400" />}
                    <div>
                      <p className="font-bold">{lastAction.type === 'entry' ? '✓ Entrada registrada' : '✓ Salida registrada'}</p>
                      <p className="text-sm">{lastAction.persona.nombre} {lastAction.persona.apellido} • {lastAction.timestamp.toLocaleTimeString()}</p>
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
                  Dentro del predio ({personasDentro.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-400 border-t-transparent" />
                </div>
              ) : personasDentro.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <User className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">Nadie dentro del predio</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {personasDentro.map(({ persona, acceso, hrs, mins }) => (
                    <div
                      key={acceso.id}
                      className="flex items-center justify-between p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <User className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-medium">{persona.nombre} {persona.apellido}</p>
                          <p className="text-sm text-zinc-400">{persona.dni} • {persona.rol}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-emerald-400">Hace {hrs}h {mins}m</p>
                        <p className="text-xs text-zinc-500">Entró: {new Date(acceso.hora_entrada).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
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