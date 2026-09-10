'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { formatMoney } from '@/lib/format'
import type { CierreCaja } from '@/lib/services/caja'
import type { VentaDelDia } from '@/lib/repos/caja'
import { registrarVentaAction } from './actions'

const MEDIOS_CAJA = ['efectivo', 'transferencia', 'mercadopago', 'modo'] as const

type PersonaOpt = { id: string; label: string }
type Item = { concepto: string; precio: string; cantidad: string }

const MEDIO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  mercadopago: 'MercadoPago',
  modo: 'MODO',
  debito_automatico: 'Débito automático',
}

const itemVacio = (): Item => ({ concepto: '', precio: '', cantidad: '1' })

export function CajaClient({
  personas,
  cierre,
  ventas,
}: {
  personas: PersonaOpt[]
  cierre: CierreCaja
  ventas: VentaDelDia[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'venta' | 'cierre'>('venta')
  const [items, setItems] = useState<Item[]>([itemVacio()])
  const [personaId, setPersonaId] = useState('')
  const [medioPago, setMedioPago] = useState<string>('efectivo')
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({})
  const [pending, start] = useTransition()

  const total = useMemo(
    () =>
      items.reduce((s, it) => {
        const p = Number(it.precio.replace(',', '.'))
        const c = Number(it.cantidad)
        return s + (Number.isFinite(p) && Number.isFinite(c) ? Math.round(p) * c : 0)
      }, 0),
    [items]
  )

  const fiado = medioPago === 'fiado'

  function setItem(i: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  }
  function addItem() {
    setItems((prev) => [...prev, itemVacio()])
  }
  function removeItem(i: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)))
  }

  function registrar() {
    setAviso(null)
    setFieldErr({})
    start(async () => {
      const res = await registrarVentaAction({
        persona_id: personaId || null,
        medio_pago: fiado ? null : medioPago,
        items,
      })
      if (res.ok) {
        setAviso({
          tipo: 'ok',
          texto: res.data.fiado
            ? `Venta fiada por ${formatMoney(res.data.total)} cargada a la cuenta.`
            : `Venta cobrada: ${formatMoney(res.data.total)}.`,
        })
        setItems([itemVacio()])
        setPersonaId('')
        setMedioPago('efectivo')
        router.refresh()
      } else {
        const detalle = res.fieldErrors ? Object.values(res.fieldErrors)[0] : null
        setAviso({ tipo: 'error', texto: detalle ?? res.error })
        if (res.fieldErrors) setFieldErr(res.fieldErrors)
      }
    })
  }

  const medioOptions = [
    ...MEDIOS_CAJA.map((m) => ({ value: m, label: MEDIO_LABEL[m] ?? m })),
    { value: 'fiado', label: 'Fiar (a cuenta corriente)' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Caja</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Venta de kiosco y cierre del día</p>
      </div>

      {aviso && (
        <Alert
          variant={aviso.tipo === 'ok' ? 'success' : 'danger'}
          dismissible
          onDismiss={() => setAviso(null)}
        >
          {aviso.texto}
        </Alert>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="venta">Venta rápida</TabsTrigger>
          <TabsTrigger value="cierre">Cierre del día</TabsTrigger>
        </TabsList>

        <TabsContent value="venta">
          <Card padding="md">
            <CardHeader>
              <CardTitle>Nueva venta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-3">
                  {items.map((it, i) => (
                    <div key={i} className="flex flex-wrap items-end gap-2">
                      <div className="flex-1 min-w-[10rem]">
                        <Input
                          label={i === 0 ? 'Concepto' : undefined}
                          placeholder="Ej. Agua saborizada"
                          value={it.concepto}
                          onChange={(e) => setItem(i, { concepto: e.target.value })}
                        />
                      </div>
                      <div className="w-20">
                        <Input
                          label={i === 0 ? 'Cant.' : undefined}
                          type="number"
                          min={1}
                          value={it.cantidad}
                          onChange={(e) => setItem(i, { cantidad: e.target.value })}
                        />
                      </div>
                      <div className="w-28">
                        <Input
                          label={i === 0 ? 'Precio unit.' : undefined}
                          inputMode="decimal"
                          placeholder="0"
                          value={it.precio}
                          onChange={(e) => setItem(i, { precio: e.target.value })}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(i)}
                        disabled={items.length === 1}
                        aria-label="Quitar ítem"
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    + Agregar ítem
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Select
                    label="Medio de pago"
                    value={medioPago}
                    onChange={(e) => setMedioPago(e.target.value)}
                    options={medioOptions}
                    error={fieldErr.medio_pago}
                  />
                  <Select
                    label={fiado ? 'Socio (obligatorio para fiar)' : 'Socio (opcional)'}
                    value={personaId}
                    onChange={(e) => setPersonaId(e.target.value)}
                    options={[
                      { value: '', label: fiado ? 'Elegir…' : 'Consumidor final' },
                      ...personas.map((p) => ({ value: p.id, label: p.label })),
                    ]}
                    error={fieldErr.persona_id}
                  />
                </div>

                <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-4">
                  <span className="text-lg font-bold text-zinc-900 dark:text-white">
                    Total {formatMoney(total)}
                  </span>
                  <Button onClick={registrar} loading={pending} disabled={total <= 0}>
                    {fiado ? 'Fiar' : 'Cobrar'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cierre">
          <div className="grid gap-4 md:grid-cols-2">
            <Card padding="md">
              <CardHeader>
                <CardTitle>Ingresos del día</CardTitle>
              </CardHeader>
              <CardContent>
                <LineasMedio lineas={cierre.ingresos} total={cierre.totalIngresos} />
              </CardContent>
            </Card>

            <Card padding="md">
              <CardHeader>
                <CardTitle>Egresos del día</CardTitle>
              </CardHeader>
              <CardContent>
                <LineasMedio lineas={cierre.egresos} total={cierre.totalEgresos} />
              </CardContent>
            </Card>
          </div>

          <Card padding="md" className="mt-4">
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3 text-center">
                <Resumen label="Neto del día" valor={cierre.neto} />
                <Resumen label="Efectivo en caja" valor={cierre.efectivoNeto} />
                <Resumen
                  label={`Fiado (${cierre.fiadoDelDia.cantidad})`}
                  valor={cierre.fiadoDelDia.total}
                  neutro
                />
              </div>
            </CardContent>
          </Card>

          <Card padding="md" className="mt-4">
            <CardHeader>
              <CardTitle>Ventas de hoy ({ventas.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {ventas.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 py-3 text-center">
                  Sin ventas registradas hoy.
                </p>
              ) : (
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {ventas.map((v) => (
                    <div key={v.id} className="flex items-start justify-between gap-2 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="truncate text-zinc-900 dark:text-white">{v.concepto ?? 'Venta'}</p>
                        <p className="text-xs text-zinc-400">
                          {v.apellido}, {v.nombre}
                          {v.saldo > 0 && (
                            <Badge variant="warning" size="sm" className="ml-2">
                              fiado
                            </Badge>
                          )}
                        </p>
                      </div>
                      <span className="shrink-0 font-medium">{formatMoney(v.monto)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function LineasMedio({ lineas, total }: { lineas: CierreCaja['ingresos']; total: number }) {
  if (lineas.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400 py-2">Nada registrado.</p>
  }
  return (
    <div className="space-y-1.5">
      {lineas.map((l) => (
        <div key={l.medioPago} className="flex justify-between text-sm">
          <span className="text-zinc-600 dark:text-zinc-300">
            {MEDIO_LABEL[l.medioPago] ?? l.medioPago}{' '}
            <span className="text-zinc-400">· {l.cantidad}</span>
          </span>
          <span className="font-medium text-zinc-900 dark:text-white">{formatMoney(l.total)}</span>
        </div>
      ))}
      <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-1.5 text-sm font-bold">
        <span>Total</span>
        <span>{formatMoney(total)}</span>
      </div>
    </div>
  )
}

function Resumen({ label, valor, neutro }: { label: string; valor: number; neutro?: boolean }) {
  return (
    <div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p
        className={`text-xl font-bold ${
          neutro
            ? 'text-zinc-900 dark:text-white'
            : valor < 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-green-600 dark:text-green-400'
        }`}
      >
        {formatMoney(valor)}
      </p>
    </div>
  )
}
