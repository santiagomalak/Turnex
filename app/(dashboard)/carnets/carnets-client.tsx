'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Download, QrCode, Users, Printer, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import type { Persona } from '@/lib/types'

export function CarnetsClient({ socios }: { socios: Persona[] }) {
  const [buscar, setBuscar] = useState('')
  const [filtrarEstado, setFiltrarEstado] = useState<'todos' | 'con-qr' | 'sin-qr'>('todos')
  const [seleccionados, setSeleccionados] = useState<string[]>([])
  const [generando, setGenerando] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [total, setTotal] = useState(0)
  const { success, error: toastError, info } = useToast()

  const sociosFiltrados = useMemo(() => {
    let filtrados = socios

    if (buscar) {
      const q = buscar.toLowerCase()
      filtrados = filtrados.filter(p =>
        `${p.nombre} ${p.apellido}`.toLowerCase().includes(q) ||
        p.dni?.includes(q) ||
        p.email?.toLowerCase().includes(q)
      )
    }

    if (filtrarEstado === 'con-qr') {
      filtrados = filtrados.filter(p => p.dni && p.dni.length >= 7)
    } else if (filtrarEstado === 'sin-qr') {
      filtrados = filtrados.filter(p => !p.dni || p.dni.length < 7)
    }

    return filtrados
  }, [socios, buscar, filtrarEstado])

  const toggleSeleccion = (id: string) => {
    setSeleccionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleTodos = () => {
    if (seleccionados.length === sociosFiltrados.length) {
      setSeleccionados([])
    } else {
      setSeleccionados(sociosFiltrados.map(p => p.id))
    }
  }

  const generarCarnetPDF = async (persona: Persona) => {
    const response = await fetch(`/api/carnet/${persona.id}`)
    if (!response.ok) throw new Error('Error generando PDF')

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `carnet-${persona.dni}-${persona.apellido}-${persona.nombre}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const generarPDF = async (ids: string[]) => {
    setGenerando(true)
    setProgreso(0)
    setTotal(ids.length)

    try {
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]
        const persona = socios.find(p => p.id === id)
        if (!persona) continue

        setProgreso(Math.round(((i + 1) / ids.length) * 100))
        await generarCarnetPDF(persona)
        await new Promise(r => setTimeout(r, 100))
      }

      success(`${ids.length} carnets generados correctamente`)
    } catch (err) {
      console.error('Error generando carnets:', err)
      toastError('Error al generar carnets')
    } finally {
      setGenerando(false)
      setProgreso(0)
      setSeleccionados([])
    }
  }

  const generarTodos = () => {
    const ids = sociosFiltrados.filter(p => p.dni && p.dni.length >= 7).map(p => p.id)
    if (ids.length === 0) {
      info('No hay socios con DNI válido para generar carnets')
      return
    }
    generarPDF(ids)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Carnets QR</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Generar e imprimir carnets de socios con código QR</p>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <Card padding="md">
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Buscar por nombre, DNI o email..."
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
              className="flex-1"
            />
            <select
              value={filtrarEstado}
              onChange={e => setFiltrarEstado(e.target.value as 'todos' | 'con-qr' | 'sin-qr')}
              className="sm:w-48 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800"
            >
              <option value="todos">Todos</option>
              <option value="con-qr">Con DNI válido</option>
              <option value="sin-qr">Sin DNI válido</option>
            </select>
          </div>

          <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
            <span>{sociosFiltrados.length} de {socios.length} socios</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>{seleccionados.length} seleccionados</span>
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant={seleccionados.length === sociosFiltrados.length && sociosFiltrados.length > 0 ? 'secondary' : 'outline'}
              onClick={toggleTodos}
              disabled={sociosFiltrados.length === 0}
            >
              {seleccionados.length === sociosFiltrados.length && sociosFiltrados.length > 0 ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </Button>

            <Button
              variant="outline"
              onClick={() => generarPDF(seleccionados)}
              disabled={seleccionados.length === 0 || generando}
              loading={generando}
            >
              <Download className="w-4 h-4 mr-2" />
              Generar seleccionados ({seleccionados.length})
            </Button>

            <Button
              onClick={generarTodos}
              disabled={generando}
              loading={generando}
            >
              <Printer className="w-4 h-4 mr-2" />
              Generar TODOS visibles ({sociosFiltrados.filter(p => p.dni && p.dni.length >= 7).length})
            </Button>
          </div>

          {generando && (
            <Alert variant="info" className="mt-4">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-zinc-900 border-t-transparent" />
                <span>Generando {progreso}% ({Math.round((progreso / 100) * total)} de {total})</span>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Lista de socios */}
      <Card padding="md">
        <CardContent>
          {sociosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
              <Users className="w-12 h-12 mx-auto mb-4 text-zinc-300 dark:text-zinc-600" />
              <p>No se encontraron socios</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sociosFiltrados.map(p => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    seleccionados.includes(p.id)
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                  onClick={() => toggleSeleccion(p.id)}
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={seleccionados.includes(p.id)}
                      onChange={() => toggleSeleccion(p.id)}
                      className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <QrCode className="w-6 h-6 text-zinc-400" />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">{p.nombre} {p.apellido}</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        DNI: {p.dni || '—'} • {p.email || 'Sin email'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={p.estado === 'activo' ? 'success' : p.estado === 'moroso' ? 'danger' : 'default'}>
                      {p.estado}
                    </Badge>
                    {p.plan_membresia_id && (
                      <Badge variant="info">Plan activo</Badge>
                    )}
                    <Badge variant={p.dni && p.dni.length >= 7 ? 'success' : 'default'}>
                      {p.dni && p.dni.length >= 7 ? 'QR listo' : 'Sin DNI'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {generando && (
            <Alert variant="info" className="mt-4">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-zinc-900 border-t-transparent" />
                <span>Generando {progreso}% ({Math.round((progreso / 100) * total)} de {total})</span>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Instrucciones */}
      <Card padding="md" className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Cómo funciona
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
          <p>• El QR contiene el código único del carnet del socio. Al escanear en el <strong>Kiosco</strong> (<kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 rounded border">/kiosco</kbd>) se registra entrada/salida.</p>
          <p>• Se genera un PDF por socio con: nombre, DNI, QR, plan, estado.</p>
          <p>• Imprimir en cartulina <strong>8.5 x 5.4 cm</strong> (tamaño tarjeta crédito) o A4 con 10 por hoja.</p>
          <p>• Socios sin DNI válido (7-8 dígitos) no generan carnet — completar en ficha de persona.</p>
        </CardContent>
      </Card>
    </div>
  )
}

function Info({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
