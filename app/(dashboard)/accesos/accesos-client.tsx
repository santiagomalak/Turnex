'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { formatMoney } from '@/lib/format'
import type { Persona } from '@/lib/types-supabase'
import type { AccesoConPersona } from '@/lib/repos/acceso'
import type { ResultadoBusqueda } from '@/lib/services/acceso'
import { buscarPersonaAction, entradaAction, salidaAction } from './actions'

function hace(desde: string): string {
  const min = Math.floor((Date.now() - new Date(desde).getTime()) / 60000)
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)} h ${min % 60} min`
}

export function AccesosClient({
  dentro,
  historial,
  personas,
  filtros,
}: {
  dentro: AccesoConPersona[]
  historial: AccesoConPersona[]
  personas: Persona[]
  filtros: { desde: string; hasta: string; persona: string }
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'checkin' | 'log'>('checkin')
  const [resultado, setResultado] = useState<ResultadoBusqueda | null>(null)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [pending, start] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  // Refresco automático de "personas dentro" cada 30 s.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 30_000)
    return () => clearInterval(t)
  }, [router])

  function buscar() {
    const v = (inputRef.current?.value ?? '').trim()
    if (!v) return
    setAviso(null)
    start(async () => {
      const res = await buscarPersonaAction(v)
      if (res.ok) setResultado(res.data)
      else setAviso({ tipo: 'error', texto: res.error })
    })
  }

  function accion(fn: () => Promise<{ ok: boolean; error?: string }>, exito: string) {
    setAviso(null)
    start(async () => {
      const res = await fn()
      if (res.ok) {
        setAviso({ tipo: 'ok', texto: exito })
        if (inputRef.current) inputRef.current.value = ''
        setResultado(null)
        inputRef.current?.focus()
        router.refresh()
      } else {
        setAviso({ tipo: 'error', texto: res.error ?? 'Error' })
      }
    })
  }

  function navegarLog(patch: Record<string, string>) {
    const usp = new URLSearchParams({ ...filtros, ...patch })
    router.push(`/accesos?${usp.toString()}`)
  }

  const logColumns = [
    {
      key: 'fh',
      header: 'Ingreso',
      render: (a: AccesoConPersona) => new Date(a.hora_entrada).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    },
    { key: 'p', header: 'Persona', render: (a: AccesoConPersona) => `${a.nombre} ${a.apellido}` },
    { key: 'dni', header: 'DNI', render: (a: AccesoConPersona) => a.dni ?? '—' },
    { key: 'rol', header: 'Rol', render: (a: AccesoConPersona) => <Badge variant="default">{a.rol}</Badge> },
    {
      key: 's',
      header: 'Salida',
      render: (a: AccesoConPersona) =>
        a.hora_salida ? (
          new Date(a.hora_salida).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
        ) : (
          <Badge variant="success">Dentro</Badge>
        ),
    },
    {
      key: 'dur',
      header: 'Duración',
      render: (a: AccesoConPersona) => {
        if (!a.hora_salida) return '—'
        const min = Math.floor((new Date(a.hora_salida).getTime() - new Date(a.hora_entrada).getTime()) / 60000)
        return `${Math.floor(min / 60)}h ${min % 60}m`
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Accesos</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Entrada y salida por DNI o código de carnet</p>
      </div>

      {aviso && (
        <Alert variant={aviso.tipo === 'ok' ? 'success' : 'danger'} dismissible onDismiss={() => setAviso(null)}>
          {aviso.texto}
        </Alert>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="checkin">Check-in / Check-out</TabsTrigger>
          <TabsTrigger value="log">Historial ({historial.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="checkin">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card padding="md">
              <CardHeader>
                <CardTitle>Buscar persona</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    autoFocus
                    placeholder="DNI o escaneá el carnet"
                    onKeyDown={(e) => e.key === 'Enter' && buscar()}
                  />
                  <Button onClick={buscar} loading={pending}>Buscar</Button>
                </div>

                {resultado?.encontrada === false && (
                  <Alert variant="warning">No se encontró ninguna persona con ese DNI o código.</Alert>
                )}

                {resultado?.encontrada && (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-zinc-900 dark:text-white">
                          {resultado.persona.nombre} {resultado.persona.apellido}
                        </p>
                        <Badge variant="default">{resultado.persona.rol}</Badge>
                      </div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        DNI {resultado.persona.dni ?? '—'} · {resultado.persona.email ?? 'sin email'}
                      </p>
                      {resultado.dentro && (
                        <p className="text-sm text-green-600 dark:text-green-400 mt-1">Actualmente dentro del predio</p>
                      )}
                    </div>

                    {resultado.deuda.vencida > 0 && (
                      <Alert variant="danger" title="Tiene deuda vencida">
                        Debe {formatMoney(resultado.deuda.vencida)} vencido
                        {resultado.deuda.total > resultado.deuda.vencida
                          ? ` (${formatMoney(resultado.deuda.total)} en total)`
                          : ''}
                        . Se puede permitir el ingreso igual.
                      </Alert>
                    )}
                    {resultado.deuda.vencida === 0 && resultado.deuda.total > 0 && (
                      <Alert variant="info">
                        Tiene {formatMoney(resultado.deuda.total)} en cuenta corriente, sin vencer.
                      </Alert>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        size="lg"
                        className="h-14"
                        disabled={pending || resultado.dentro}
                        onClick={() => accion(() => entradaAction(resultado.persona.id), 'Entrada registrada')}
                      >
                        Registrar entrada
                      </Button>
                      <Button
                        size="lg"
                        variant="secondary"
                        className="h-14"
                        disabled={pending || !resultado.dentro}
                        onClick={() => accion(() => salidaAction(resultado.persona.id), 'Salida registrada')}
                      >
                        Registrar salida
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card padding="md">
              <CardHeader>
                <CardTitle>Dentro del predio ({dentro.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[28rem] overflow-y-auto">
                  {dentro.length === 0 && (
                    <p className="text-center py-8 text-zinc-500 dark:text-zinc-400">Nadie en el predio ahora mismo</p>
                  )}
                  {dentro.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-300">{a.nombre} {a.apellido}</p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Entró {new Date(a.hora_entrada).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} · hace {hace(a.hora_entrada)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => accion(() => salidaAction(a.persona_id), 'Salida registrada')}
                      >
                        Salida
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="log">
          <Card padding="md">
            <CardHeader className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <CardTitle>Historial de accesos</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Input label="Desde" type="date" defaultValue={filtros.desde} onChange={(e) => navegarLog({ desde: e.target.value })} className="w-40" />
                <Input label="Hasta" type="date" defaultValue={filtros.hasta} onChange={(e) => navegarLog({ hasta: e.target.value })} className="w-40" />
                <Select
                  value={filtros.persona}
                  onChange={(e) => navegarLog({ persona: e.target.value })}
                  options={[{ value: '', label: 'Todas las personas' }, ...personas.map((p) => ({ value: p.id, label: `${p.nombre} ${p.apellido}` }))]}
                  className="w-56"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table columns={logColumns} data={historial} keyExtractor={(a) => a.id} emptyMessage="Sin accesos en el período" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
