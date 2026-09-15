'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from 'cmdk'
import { useRouter, usePathname } from 'next/navigation'
import { store } from '../lib/store-supabase'
import type { Persona, Espacio, Reserva, Cuota } from '../lib/types-supabase'
import {
  Search,
  Users,
  Layout,
  Calendar,
  CreditCard,
  LogIn,
  FileText,
  QrCode,
} from 'lucide-react'

interface CommandItemData {
  label: string
  description?: string
  icon?: React.ReactNode
  shortcut?: string
  onSelect: () => void
  section: string
}

const sections = [
  { id: 'navegacion', label: 'Navegación', icon: Layout },
  { id: 'personas', label: 'Personas', icon: Users },
  { id: 'espacios', label: 'Espacios', icon: Layout },
  { id: 'reservas', label: 'Reservas', icon: Calendar },
  { id: 'cobros', label: 'Cobros', icon: CreditCard },
  { id: 'accesos', label: 'Accesos', icon: LogIn },
  { id: 'kiosco', label: 'Kiosco', icon: Search },
]

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [items, setItems] = useState<CommandItemData[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [personas, espacios, reservas, cuotas] = await Promise.all([
        store.getPersonas(),
        store.getEspacios(),
        store.getReservas({ fecha: store.formatDate(new Date()) }),
        store.getCuotas({ estado: 'pendiente' }),
      ])

      const newItems: CommandItemData[] = [
        // Navegación
        { label: 'Dashboard', description: 'Vista general', icon: <Layout className="w-4 h-4" />, shortcut: 'G D', onSelect: () => router.push('/dashboard'), section: 'navegacion' },
        { label: 'Personas', description: 'Socios, invitados, staff', icon: <Users className="w-4 h-4" />, shortcut: 'G P', onSelect: () => router.push('/personas'), section: 'navegacion' },
        { label: 'Espacios', description: 'Canchas y disponibilidad', icon: <Layout className="w-4 h-4" />, shortcut: 'G E', onSelect: () => router.push('/espacios'), section: 'navegacion' },
        { label: 'Reservas', description: 'Calendario de reservas', icon: <Calendar className="w-4 h-4" />, shortcut: 'G R', onSelect: () => router.push('/reservas'), section: 'navegacion' },
        { label: 'Cobros', description: 'Pagos y cuotas', icon: <CreditCard className="w-4 h-4" />, shortcut: 'G C', onSelect: () => router.push('/cobros'), section: 'navegacion' },
        { label: 'Accesos', description: 'Check-in / Check-out', icon: <LogIn className="w-4 h-4" />, shortcut: 'G A', onSelect: () => router.push('/accesos'), section: 'navegacion' },
        { label: 'Kiosco', description: 'Modo escáner fullscreen', icon: <Search className="w-4 h-4" />, shortcut: 'G K', onSelect: () => router.push('/kiosco'), section: 'navegacion' },

        // Acciones rápidas
        { label: 'Nueva Persona', description: 'Crear socio/invitado/staff', icon: <Users className="w-4 h-4" />, shortcut: 'N P', onSelect: () => { router.push('/personas'); setTimeout(() => (document.querySelector('[data-cmd="new-persona"]') as HTMLElement)?.click(), 100) }, section: 'navegacion' },
        { label: 'Nueva Reserva', description: 'Reservar cancha', icon: <Calendar className="w-4 h-4" />, shortcut: 'N R', onSelect: () => { router.push('/reservas'); setTimeout(() => (document.querySelector('[data-cmd="new-reserva"]') as HTMLElement)?.click(), 100) }, section: 'navegacion' },
        { label: 'Registrar Cobro', description: 'Cobrar cuota o alquiler', icon: <CreditCard className="w-4 h-4" />, shortcut: 'N C', onSelect: () => { router.push('/cobros'); setTimeout(() => (document.querySelector('[data-cmd="new-cobro"]') as HTMLElement)?.click(), 100) }, section: 'navegacion' },

        // Personas
        ...personas.slice(0, 20).map(p => ({
          label: `${p.nombre} ${p.apellido}`,
          description: `${p.rol} · ${p.estado} · DNI: ${p.dni}`,
          icon: <Users className="w-4 h-4" />,
          shortcut: '',
          onSelect: () => { router.push('/personas'); setTimeout(() => { const row = document.querySelector(`[data-persona-id="${p.id}"]`) as HTMLElement; row?.scrollIntoView(); row?.classList.add('highlight'); setTimeout(() => row?.classList.remove('highlight'), 2000) }, 100) },
          section: 'personas',
        })),

        // Espacios
        ...espacios.map(e => ({
          label: e.nombre,
          description: `${e.tipo} · $${e.precio_por_hora.toLocaleString()}/hr · ${e.estado}`,
          icon: <Layout className="w-4 h-4" />,
          shortcut: '',
          onSelect: () => { router.push('/espacios'); setTimeout(() => { const row = document.querySelector(`[data-espacio-id="${e.id}"]`) as HTMLElement; row?.scrollIntoView(); row?.classList.add('highlight'); setTimeout(() => row?.classList.remove('highlight'), 2000) }, 100) },
          section: 'espacios',
        })),

        // Reservas de hoy
        ...reservas.slice(0, 15).map(r => ({
          label: `${r.hora_inicio} - ${r.hora_fin}`,
          description: `Espacio: ${r.espacio_id} · Persona: ${r.persona_id} · ${r.estado}`,
          icon: <Calendar className="w-4 h-4" />,
          shortcut: '',
          onSelect: () => { router.push('/reservas'); setTimeout(() => { const row = document.querySelector(`[data-reserva-id="${r.id}"]`) as HTMLElement; row?.scrollIntoView(); row?.classList.add('highlight'); setTimeout(() => row?.classList.remove('highlight'), 2000) }, 100) },
          section: 'reservas',
        })),

        // Cuotas pendientes
        ...cuotas.slice(0, 15).map(c => ({
          label: `Cuota ${c.periodo.slice(0, 7)}`,
          description: `Socio: ${c.persona_id} · ${store.formatCurrency(c.monto)} · ${c.estado}`,
          icon: <FileText className="w-4 h-4" />,
          shortcut: '',
          onSelect: () => { router.push('/cobros'); setTimeout(() => { const row = document.querySelector(`[data-cuota-id="${c.id}"]`) as HTMLElement; row?.scrollIntoView(); row?.classList.add('highlight'); setTimeout(() => row?.classList.remove('highlight'), 2000) }, 100) },
          section: 'cobros',
        })),
      ]
      setItems(newItems)
    } catch (err) {
      console.error('Error loading command palette data:', err)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, loadData])

  const filteredItems = useMemo(() => {
    return items
  }, [items])

  if (!isOpen) return null

  const portalContent = (
    <Command>
      <CommandInput placeholder="Buscar... (Cmd+K)" />
      <CommandList>
        <CommandEmpty>No se encontraron resultados</CommandEmpty>
        {sections.map(section => {
          const sectionItems = filteredItems.filter(i => i.section === section.id)
          if (sectionItems.length === 0) return null
          return (
            <CommandGroup key={section.id} heading={section.label}>
              {sectionItems.map((item, idx) => (
                <CommandItem
                  key={`${section.id}-${idx}`}
                  onSelect={item.onSelect}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.description && <span className="ml-auto text-xs text-zinc-500">{item.description}</span>}
                  {item.shortcut && <span className="ml-auto text-xs text-zinc-500 font-mono">{item.shortcut}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          )
        })}
      </CommandList>
    </Command>
  )

  if (typeof window === 'undefined') return null
  return createPortal(portalContent, document.body)
}