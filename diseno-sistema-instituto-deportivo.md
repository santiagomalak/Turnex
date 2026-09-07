# Diseño del Sistema — Software de Gestión para Instituto Deportivo

## 1. Alcance funcional

El sistema cubre dos grandes ejes que en la práctica comparten la misma base de socios y cobros:

1. **Gestión de socios y cuotas** (membresía general del instituto)
2. **Gestión de canchas de pádel** (reservas + cuotas/abonos mensuales de pádel)

## 2. Stack recomendado

| Capa | Tecnología | Por qué |
|---|---|---|
| Frontend + Backend | Next.js 14+ (App Router) + TypeScript | Un solo repo, SSR para reportes, API routes para lógica de negocio |
| Base de datos | PostgreSQL (Supabase) | Auth integrada, realtime (útil para el calendario de canchas), escalable a multi-tenant después |
| ORM | Prisma | Tipado end-to-end, migraciones controladas |
| Pagos | MercadoPago SDK (Checkout API) | Estándar en Argentina para cuotas y señas |
| Notificaciones | WhatsApp Business API o Resend (email) | Recordatorios de vencimiento y confirmación de reserva |
| UI | Tailwind + shadcn/ui | Rápido de armar, se ve profesional sin diseñador |

## 3. Modelo de datos (entidades principales)

### `Socio`
- id, nombre, apellido, dni, email, telefono, fecha_alta, estado (activo/inactivo/moroso)
- categoria_membresia (relación con `PlanMembresia`)

### `PlanMembresia`
- id, nombre (ej: "Solo pádel", "Full", "Social"), precio_mensual, beneficios (incluye canchas sí/no, descuento %)

### `Cuota`
- id, socio_id, periodo (mes/año), monto, estado (pendiente/pagada/vencida), fecha_vencimiento, fecha_pago, medio_pago

### `Cancha`
- id, nombre/número, tipo (pádel), estado (activa/mantenimiento)

### `Reserva`
- id, cancha_id, socio_id, fecha, hora_inicio, hora_fin, estado (confirmada/cancelada/pendiente_pago), precio, seña_pagada (bool)

### `Pago`
- id, socio_id, cuota_id (nullable), reserva_id (nullable), monto, medio (efectivo/transferencia/MercadoPago), fecha, comprobante_url

### `Usuario` (staff del instituto)
- id, nombre, email, rol (admin/recepcion/cobranzas)

## 4. Módulos funcionales

### A. Gestión de socios
- Alta/baja/edición de socios
- Historial de pagos por socio
- Estado de morosidad automático (cuota vencida → bloqueo de reserva opcional)

### B. Cuotas mensuales
- Generación automática de cuotas el día 1 de cada mes según `PlanMembresia`
- Recordatorio automático 3 días antes del vencimiento (WhatsApp/email)
- Registro de pago (manual o vía MercadoPago webhook)
- Reporte de morosidad

### C. Canchas de pádel
- Calendario de disponibilidad (por cancha, por franja horaria)
- Reserva online por el socio (o telefónica cargada por recepción)
- Cobro de seña o pago total al reservar
- Cancelación con política de reembolso configurable
- Bloqueo de horarios para mantenimiento/eventos

### D. Reportes (para el dueño/administración)
- Ingresos mensuales (cuotas + reservas)
- Ocupación de canchas (% uso por franja horaria — útil para ajustar precios)
- Morosidad total y por socio
- Proyección de ingresos del mes

## 5. Roadmap sugerido

**MVP (4–6 semanas trabajando solo)**
1. Modelo de datos + auth (Supabase)
2. CRUD de socios y planes
3. Generación y registro manual de cuotas
4. Calendario de canchas + reservas (sin pago online todavía, registro manual)
5. Dashboard básico de ingresos

**V2**
6. Integración MercadoPago (cuotas + señas online)
7. Notificaciones automáticas (WhatsApp/email)
8. Reportes de ocupación y proyecciones
9. App/portal para que el socio reserve sin llamar a recepción

**V3 (si escala a más institutos)**
10. Multi-tenant (varios institutos en la misma plataforma)
11. Roles más granulares, facturación electrónica (AFIP)

## 6. Próximos pasos concretos
- Definir los `PlanMembresia` reales del instituto (precios, qué incluyen)
- Confirmar cantidad de canchas y franjas horarias típicas
- Decidir si arrancás con Supabase (gratis hasta cierto uso) o infra propia
